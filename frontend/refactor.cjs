const fs = require('fs');
const path = require('path');

const filePath = path.resolve('d:/Manifest System/frontend/components/FinanceDashboard.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add useSearchParams
code = code.replace(
    "import { useNavigate } from 'react-router-dom';",
    "import { useNavigate, useSearchParams } from 'react-router-dom';"
);

// 2. Replace useState for selectedEventId with useSearchParams
const stateTarget = `    const [selectedEventId, setSelectedEventId] = useState<string>('');`;
const stateReplacement = `    const [searchParams, setSearchParams] = useSearchParams();\n    const selectedEventId = searchParams.get('eventId') || '';\n    \n    const setSelectedEventId = (id: string) => {\n        setSearchParams(prev => {\n            if (id) prev.set('eventId', id);\n            else prev.delete('eventId');\n            return prev;\n        }, { replace: true });\n    };`;
code = code.replace(stateTarget, stateReplacement);

// 3. Preserve searchParams in tab navigation
const navTarget = "onClick={() => { setActiveTab(tab.id as any); navigate(`/finance/${tab.id}`); }}";
const navReplacement = "onClick={() => { setActiveTab(tab.id as any); navigate(`/finance/${tab.id}?${searchParams.toString()}`); }}";
code = code.replace(navTarget, navReplacement);

fs.writeFileSync(filePath, code);
console.log("Successfully refactored FinanceDashboard.tsx Phase 1!");
