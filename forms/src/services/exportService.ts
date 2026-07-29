// ─── Export helpers ───────────────────────────────────────────────────────────
// Converts form + responses into Excel (xlsx) or PDF (jsPDF)
// NOTE: xlsx and jspdf are imported statically so Vite bundles them directly
// into the main chunk rather than creating a separate dynamic chunk that
// fails to load on Vercel (no nested async-import chains).

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Form, FormField, FormResponse, AnswerValue } from '../types/forms.types';

// ─── Stringify a single answer value ─────────────────────────────────────────

function stringifyAnswer(field: FormField, value: AnswerValue): string {
  if (value === null || value === undefined) return '';
  if (field.type === 'yes_no')     return value ? 'Yes' : 'No';
  if (field.type === 'multi_select' && Array.isArray(value)) return value.join(', ');
  if (field.type === 'gps' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const g = value as { lat: number; lng: number };
    return `${g.lat.toFixed(6)}, ${g.lng.toFixed(6)}`;
  }
  if (field.type === 'datetime')   return new Date(value as string).toLocaleString();
  // Phone format: "+27|821234567" → "+27 821234567"
  if ((field.type === 'contact') && typeof value === 'string' && value.includes('|'))
    return value.replace('|', ' ');
  return String(value);
}

// ─── Build table data (headers + rows) ───────────────────────────────────────

function buildTable(form: Form, responses: FormResponse[]): { headers: string[]; rows: string[][] } {
  // Build headers — insert "📍 [Label] — Map Link" after every GPS field
  const headers: string[] = ['#', 'Submitted At'];
  for (const f of form.fields) {
    headers.push(f.label);
    if (f.type === 'gps') headers.push(`📍 ${f.label} — Map Link`);
  }

  // Build rows — insert map URL after every GPS answer
  const rows = responses.map((r, idx) => {
    const cells: string[] = [
      String(idx + 1),
      new Date(r.submitted_at).toLocaleString(),
    ];
    for (const f of form.fields) {
      const val = r.answers[f.id] ?? null;
      cells.push(stringifyAnswer(f, val));
      if (f.type === 'gps') {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          const g = val as { lat: number; lng: number };
          cells.push(`https://www.google.com/maps?q=${g.lat},${g.lng}`);
        } else {
          cells.push('');
        }
      }
    }
    return cells;
  });

  return { headers, rows };
}

// ─── Excel Export ─────────────────────────────────────────────────────────────

export async function exportToExcel(form: Form, responses: FormResponse[]): Promise<void> {
  const { headers, rows } = buildTable(form, responses);
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto column widths
  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map(r => (r[i] ?? '').length), 12),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Responses');
  XLSX.writeFile(wb, `${form.title.replace(/[^a-zA-Z0-9]/g, '_')}_responses.xlsx`);
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

export async function exportToPDF(form: Form, responses: FormResponse[]): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  // Title
  doc.setFontSize(18);
  doc.setTextColor(249, 115, 22); // orange-500
  doc.text(form.title, 40, 48);

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Exported on ${new Date().toLocaleString()}  ·  ${responses.length} response(s)`, 40, 65);

  const { headers, rows } = buildTable(form, responses);

  autoTable(doc, {
    startY: 80,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [249, 115, 22],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [255, 247, 237] },
    styles: { cellPadding: 5, overflow: 'linebreak' },
  });

  doc.save(`${form.title.replace(/[^a-zA-Z0-9]/g, '_')}_responses.pdf`);
}
