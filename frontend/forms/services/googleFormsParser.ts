// services/googleFormsParser.ts
// Fetches a public Google Form via CORS proxies and parses its field structure.

import type { FieldType } from '../types/forms.types';

export interface GFField {
  label: string;
  type: FieldType;
  gfTypeName: string;
  options?: string[];
  required: boolean;
  description?: string;
}

export interface GFForm {
  title: string;
  description: string;
  fields: GFField[];
}

// Google Forms internal type → our FieldType
const TYPE_MAP: Record<number, FieldType> = {
  0: 'short_text',
  1: 'long_text',
  2: 'radio',
  3: 'multi_select',
  4: 'dropdown',
  5: 'number',    // linear scale
  9: 'datetime',
  10: 'datetime',
  11: 'file',
};

export const GF_TYPE_NAME: Record<number, string> = {
  0: 'Short Answer', 1: 'Paragraph', 2: 'Multiple Choice',
  3: 'Checkboxes', 4: 'Dropdown', 5: 'Linear Scale',
  6: 'Section', 7: 'Grid', 8: 'Checkbox Grid',
  9: 'Date', 10: 'Time', 11: 'File Upload',
};

const SKIP_TYPES = new Set([6, 7, 8]);

// Multiple CORS proxies tried in order until one succeeds
const PROXIES: Array<(url: string) => string> = [
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
];

// ─── Main export ──────────────────────────────────────────────────────────────

export async function parseGoogleForm(url: string): Promise<GFForm> {
  // Build the correct viewform URL from whatever format the user pastes
  const viewUrl = resolveViewformUrl(url);
  if (!viewUrl) throw new Error('Invalid Google Forms URL — paste the full link from your browser address bar.');

  // Try each proxy in sequence
  let html = '';
  let lastError = '';
  for (const makeProxy of PROXIES) {
    try {
      html = await fetchViaProxy(makeProxy(viewUrl));
      if (html.length > 500) break; // got real content
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  if (!html || html.length < 500) {
    throw new Error(`Could not reach the form after trying multiple proxies. Last error: ${lastError || 'empty response'}`);
  }

  if (html.includes('accounts.google.com/ServiceLogin') || html.includes('SignIn'))
    throw new Error('This form requires Google sign-in. Only forms set to "Anyone with the link" can be imported.');

  // Extract FB_PUBLIC_LOAD_DATA_
  const marker = 'FB_PUBLIC_LOAD_DATA_ = ';
  const mIdx = html.indexOf(marker);
  if (mIdx === -1)
    throw new Error('Could not find form data. Make sure the form is public and the link is correct.');

  const dataStart = mIdx + marker.length;
  // End marker can be ";\n" or ";</script>"
  let endIdx = html.indexOf(';\n', dataStart);
  if (endIdx === -1) endIdx = html.indexOf(';</script>', dataStart);
  if (endIdx === -1) throw new Error('Could not parse form structure.');

  let raw: unknown;
  try { raw = JSON.parse(html.slice(dataStart, endIdx)); }
  catch { throw new Error('Failed to decode form data — the form structure may have changed.'); }

  // Extract title from <title> tag
  let title = 'Imported Form';
  const titleM = html.match(/<title>([^<]+)<\/title>/);
  if (titleM) title = titleM[1].replace(/ - Google Forms$/i, '').trim();

  // Walk the JSON tree to find question nodes
  const questions = findQuestions(raw);
  const fields: GFField[] = questions
    .filter(q => !SKIP_TYPES.has(q.gfType))
    .map(q => ({
      label: q.title,
      type: TYPE_MAP[q.gfType] ?? 'short_text',
      gfTypeName: GF_TYPE_NAME[q.gfType] ?? 'Unknown',
      options: q.options.length ? q.options : undefined,
      required: q.required,
      description: q.description || undefined,
    }));

  if (!fields.length)
    throw new Error('No importable fields found. The form may be empty or use unsupported field types.');

  return { title, description: '', fields };
}

// ─── URL resolution ───────────────────────────────────────────────────────────

function resolveViewformUrl(input: string): string | null {
  // Already a viewform URL — use as-is (handles /d/e/PUBLISHED_ID/viewform)
  if (input.includes('docs.google.com/forms')) {
    // Ensure it ends with /viewform
    const clean = input.split('?')[0].replace(/\/(edit|prefill|closedform)$/, '');
    return clean.endsWith('/viewform') ? clean : clean + '/viewform';
  }
  // Raw form ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) {
    return `https://docs.google.com/forms/d/${input.trim()}/viewform`;
  }
  return null;
}

// ─── Fetch via proxy (handles both plain-text and {contents:...} responses) ──

async function fetchViaProxy(proxyUrl: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const resp = await fetch(proxyUrl, { signal: ctrl.signal });
    clearTimeout(t);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    // allorigins returns { contents: "..." } JSON; others return raw HTML
    try {
      const json = JSON.parse(text);
      if (typeof json?.contents === 'string') return json.contents;
    } catch { /* not JSON — use raw text */ }
    return text;
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

// ─── JSON tree walker ─────────────────────────────────────────────────────────

interface RawQ { title: string; description: string; gfType: number; options: string[]; required: boolean; }

function findQuestions(data: unknown, depth = 0): RawQ[] {
  if (depth > 15 || !Array.isArray(data)) return [];
  const results: RawQ[] = [];
  const seen = new Set<string>();

  // Heuristic: question node has non-empty string at [1], integer 0-11 at [3]
  if (
    data.length >= 4 &&
    typeof data[1] === 'string' && data[1].length > 0 &&
    typeof data[3] === 'number' && Number.isInteger(data[3]) && data[3] >= 0 && data[3] <= 11
  ) {
    const title = data[1] as string;
    if (!seen.has(title)) {
      seen.add(title);
      results.push({
        title,
        description: typeof data[2] === 'string' ? data[2] : '',
        gfType: data[3] as number,
        options: extractOptions(data[4]),
        required: checkRequired(data),
      });
    }
    return results;
  }

  for (const child of data) {
    for (const q of findQuestions(child, depth + 1)) {
      if (!seen.has(q.title)) { seen.add(q.title); results.push(q); }
    }
  }
  return results;
}

function extractOptions(node: unknown, depth = 0): string[] {
  if (depth > 4 || !Array.isArray(node)) return [];
  const opts: string[] = [];
  for (const item of node) {
    if (typeof item === 'string' && item.length > 0 && item.length < 300) opts.push(item);
    else if (Array.isArray(item)) opts.push(...extractOptions(item, depth + 1));
  }
  return [...new Set(opts)].slice(0, 30);
}

function checkRequired(node: unknown[]): boolean {
  try { return Array.isArray(node[4]) && node[4][2] === 1; }
  catch { return false; }
}
