const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.join(__dirname, 'backend', '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Levenshtein distance
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

// Similarity percentage: 0 to 100
function similarity(s1, s2) {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength == 0) return 100;
  return Math.round(((longerLength - levenshtein(longer, shorter)) / parseFloat(longerLength)) * 100);
}

function cleanPhone(p) {
  if (!p) return '';
  return p.replace(/\D/g, '').slice(-9); // last 9 digits
}

function normalizeName(n) {
  if (!n) return '';
  return n.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Format phone for display
function pFmt(p) {
    return p || 'N/A';
}

async function run() {
  console.log("Fetching all members from database...");
  let members = [];
  let from = 0;
  const step = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('members')
      .select('id, name, phone, residency')
      .order('created_at', { ascending: true })
      .range(from, from + step - 1);

    if (error) {
      console.error("Error fetching members:", error);
      return;
    }

    if (data.length === 0) break;
    
    members = members.concat(data);
    from += step;
  }

  console.log(`Found ${members.length} members. Analyzing for 50%+ fuzzy duplicates...`);

  // We are looking for:
  // 1. Similar Contacts (>= 50%), Exact/Similar Names
  // 2. Similar Names (>= 50%), Exact/Similar Contacts
  // Basically anything > 50% across BOTH fields, or > 80% on one and > 50% on another.
  // The user said: "focus on similar contacts, similar names, for the rest over 50% similarity"
  
  // We will categorize them to make it readable:
  const highlySimilarNameHighlySimilarContact = []; // Both > 80% but not 100%
  const highlySimilarNameModerateContact = [];      // Name > 80%, Contact 50-79%
  const moderateNameHighlySimilarContact = [];      // Name 50-79%, Contact it > 80%
  const moderateNameModerateContact = [];           // Both 50-79%
  const exactlySameNameDiffContact = [];            // Filtered to > 50% difference only (to avoid huge lists usually)
  const exactlySameContactDiffName = [];

  // O(N^2) comparison
  for (let i = 0; i < members.length; i++) {
    const m1 = members[i];
    const n1 = normalizeName(m1.name);
    const p1 = cleanPhone(m1.phone);
    if (!n1) continue;

    for (let j = i + 1; j < members.length; j++) {
      const m2 = members[j];
      const n2 = normalizeName(m2.name);
      const p2 = cleanPhone(m2.phone);
      if (!n2) continue;

      const nameSim = similarity(n1, n2);
      const phoneSim = (p1 && p2) ? similarity(p1, p2) : (p1 === p2 ? 100 : 0);
      
      const isSamePhone = phoneSim === 100;
      const isSameName = nameSim === 100;

      // Skip exact matches (Name 100, Phone 100) -> SQL already handles exact duplicates
      if (isSamePhone && isSameName) continue;

      // Skip anything less than 50% on BOTH metrics because they aren't related
      if (nameSim < 50 && phoneSim < 50) continue;

      const matchObj = {
          nameSim,
          phoneSim,
          m1: m1,
          m2: m2
      };

      if (isSameName) {
         if (phoneSim >= 50 && phoneSim < 100) {
            exactlySameNameDiffContact.push(matchObj);
         }
      } else if (isSamePhone) {
         if (nameSim >= 50 && nameSim < 100) {
            exactlySameContactDiffName.push(matchObj);
         }
      } else {
         // Neither exactly same Name nor exactly same Phone
         if (nameSim >= 80 && phoneSim >= 80) {
            highlySimilarNameHighlySimilarContact.push(matchObj);
         } else if (nameSim >= 80 && phoneSim >= 50 && phoneSim < 80) {
            highlySimilarNameModerateContact.push(matchObj);
         } else if (nameSim >= 50 && nameSim < 80 && phoneSim >= 80) {
            moderateNameHighlySimilarContact.push(matchObj);
         } else if (nameSim >= 50 && nameSim < 80 && phoneSim >= 50 && phoneSim < 80) {
            moderateNameModerateContact.push(matchObj);
         }
      }
    }
  }

  // Generate Markdown Report
  let report = `# Extended Fuzzy Duplicate Audit Report (>50%)\n\n`;
  report += `This report identifies potential duplicate members with at least 50% similarity across Names OR Contexts.\n\n`;

  function renderTable(title, description, data) {
    let md = `## ${title}\n${description}\n\n`;
    if (data.length === 0) {
       md += `*No matches found in this category.*\n\n`;
       return md;
    }
    md += `| Record A Name | Record A Phone | Record B Name | Record B Phone | Name Sim. | Phone Sim. |\n`;
    md += `|---|---|---|---|---|---|\n`;
    // Sort by combined similarity
    data.sort((a,b) => (b.nameSim + b.phoneSim) - (a.nameSim + a.phoneSim)).forEach(match => {
      md += `| ${match.m1.name} | ${pFmt(match.m1.phone)} | ${match.m2.name} | ${pFmt(match.m2.phone)} | ${match.nameSim}% | ${match.phoneSim}% |\n`;
    });
    md += `\n`;
    return md;
  }

  report += renderTable(
      "1. Exact Same Contact, Moderately Similar Name (50%+)",
      "Exactly the same phone number, and names are over 50% similar. High likelihood of being the same person with a severe typo or a relative sharing a phone.",
      exactlySameContactDiffName
  );

  report += renderTable(
      "2. Exact Same Name, Moderately Similar Contact (50%+)",
      "Exactly the same name, and phone numbers are over 50% similar. High likelihood of being the same person with a typo in their phone number.",
      exactlySameNameDiffContact
  );

  report += renderTable(
      "3. Highly Similar Name (>80%), Highly Similar Contact (>80%)",
      "Both name and phone numbers have minor typos but are largely identical. Extreme likelihood of duplicate.",
      highlySimilarNameHighlySimilarContact
  );

  report += renderTable(
      "4. Highly Similar Name (>80%), Moderately Similar Contact (50-79%)",
      "Name is very similar. Phone number shares more than half its digits.",
      highlySimilarNameModerateContact
  );

  report += renderTable(
      "5. Moderately Similar Name (50-79%), Highly Similar Contact (>80%)",
      "Phone numbers have a minor typo. Names are only somewhat similar (e.g. sharing a last name but different first name). Could be relatives.",
      moderateNameHighlySimilarContact
  );

  const reportPath = path.join(__dirname, 'extended_fuzzy_audit.md');
  fs.writeFileSync(reportPath, report);
  console.log(`Report generated successfully at ${reportPath}`);
}

run();
