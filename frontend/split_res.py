import sys
import re

filepath = r"d:\Manifest System\frontend\components\ResidentDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    text = f.read()

# -----------------
# 1. OVERVIEW TAB
# -----------------
ov_start_str = "            {/* Tab Content: Overview */}\n            {activeTab === 'overview' && ("
ov_end_str = "            {/* Tab Content: Residences */}\n"

ov_start = text.find(ov_start_str)
ov_end = text.find(ov_end_str)

ov_jsx = text[ov_start + len(ov_start_str):ov_end]
ov_jsx = ov_jsx.rstrip()
if ov_jsx.endswith(")}"):
    ov_jsx = ov_jsx[:-2]

overview_file = """import React from 'react';
import { MapPin, Users, Activity } from 'lucide-react';

const OverviewTab = ({ reports, residences, totalSoulsWon, totalResidences, recentReports }: any) => (
""" + ov_jsx + """
);

export default OverviewTab;
"""

with open(r"d:\Manifest System\frontend\components\residents\OverviewTab.tsx", "w", encoding="utf-8", newline="\n") as f:
    f.write(overview_file)


# -----------------
# 2. REPORTS TAB
# -----------------
rp_start_str_1 = "            {/* Tab Content: Reports */}\n            {\n                activeTab === 'reports' && ("
rp_start_str_2 = "            {/* Tab Content: Reports */}\n            {activeTab === 'reports' && ("

rp_start = text.find(rp_start_str_1)
if rp_start == -1:
    rp_start = text.find(rp_start_str_2)
    rp_start_len = len(rp_start_str_2)
else:
    rp_start_len = len(rp_start_str_1)

rp_end_str = "        </div >\n    );\n};\n"
rp_end = text.rfind(rp_end_str)

rp_jsx = text[rp_start + rp_start_len:rp_end]
rp_jsx = rp_jsx.rstrip()
if rp_jsx.endswith(")}"):
    rp_jsx = rp_jsx[:-2]
elif rp_jsx.endswith(")"):
    rp_jsx = rp_jsx[:-1]
    if rp_jsx.endswith("}"):
        rp_jsx = rp_jsx[:-1] # Remove inner brace if it was `{ activeTab ... && ( ... ) }`

state_start = text.find("    const [showAddReport, setShowAddReport] = useState(false);")
state_end = text.find("    // 2-step Add Residence flow states")
report_state_1 = text[state_start:state_end]

state2_start = text.find("    const [newReport, setNewReport] = useState<Partial<ResidenceOutreachReport>>(")
state2_end = text.find("    const [selectedResidenceForDetails, setSelectedResidenceForDetails] = useState<Residence | null>(null);")
report_state_2 = text[state2_start:state2_end]

handler_start = text.find("    const handleAddReport = async (e: React.FormEvent) => {")
handler_end = text.find("    if (loading && residences.length === 0) {")
report_handler = text[handler_start:handler_end]

reports_file = """import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { ResidenceOutreachReport } from '../../types';

const ReportsTab = ({ reports, residences, events, addReport, loading }: any) => {
""" + report_state_1 + report_state_2 + report_handler + """
    return (
""" + rp_jsx + """
    );
};

export default ReportsTab;
"""

with open(r"d:\Manifest System\frontend\components\residents\ReportsTab.tsx", "w", encoding="utf-8", newline="\n") as f:
    f.write(reports_file)


# -----------------
# 3. RESIDENCES TAB
# -----------------
rs_start_str = "            {/* Tab Content: Residences */}\n            {activeTab === 'residences' && ("
rs_end_str = "            {/* Tab Content: Reports */}\n"

rs_start = text.find(rs_start_str)
rs_end = text.find(rs_end_str)

rs_jsx = text[rs_start + len(rs_start_str):rs_end]
rs_jsx = rs_jsx.rstrip()
if rs_jsx.endswith(")}"):
    rs_jsx = rs_jsx[:-2]

state_start = text.find("    const [showAddResidence, setShowAddResidence] = useState(false);")
state_end = text.find("    useEffect(() => {")
res_state = text[state_start:state_end]

handler_start = text.find("    const handleViewResidence = async (residence: Residence) => {")
handler_end = text.find("    if (loading && residences.length === 0) {")
res_handler = text[handler_start:handler_end]

residences_file = """import React, { useState } from 'react';
import { Plus, Home, Check, ChevronRight, ChevronLeft, Search, Loader2, ChevronDown, ChevronUp, Trash2, Users, Activity, X } from 'lucide-react';
import { Residence, Member } from '../../types';
import { MemberStore } from '../../database/memberStore';

const ResidencesTab = ({ residences, reports, events, fetchResidenceMembers, deleteResidence, addResidence }: any) => {
""" + res_state + res_handler + """
    return (
""" + rs_jsx + """
    );
};

export default ResidencesTab;
"""

with open(r"d:\Manifest System\frontend\components\residents\ResidencesTab.tsx", "w", encoding="utf-8", newline="\n") as f:
    f.write(residences_file)


# -----------------
# 4. MODIFY DASHBOARD
# -----------------
import_statements = """import OverviewTab from './residents/OverviewTab';
import ReportsTab from './residents/ReportsTab';
import ResidencesTab from './residents/ResidencesTab';
"""

# Text replacement
new_text = text.replace("import { MemberStore } from '../database/memberStore';", "import { MemberStore } from '../database/memberStore';\n" + import_statements)

# Remove extracted states and handlers from Dashboard
new_text = new_text.replace(report_state_1, "")
new_text = new_text.replace(report_state_2, "")
new_text = new_text.replace(report_handler, "")

new_text = new_text.replace(res_state, "    // Extracted state for Residences Tab\n")
new_text = new_text.replace(res_handler, "    // Extracted handlers for Residences Tab\n")

# Replace JSX blocks
new_text = new_text.replace(text[ov_start:ov_end], "            {/* Tab Content: Overview */}\n            {activeTab === 'overview' && <OverviewTab reports={reports} residences={residences} totalSoulsWon={totalSoulsWon} totalResidences={totalResidences} recentReports={recentReports} />}\n\n")

new_text = new_text.replace(text[rs_start:rs_end], "            {/* Tab Content: Residences */}\n            {activeTab === 'residences' && <ResidencesTab residences={residences} reports={reports} events={events} fetchResidenceMembers={fetchResidenceMembers} deleteResidence={deleteResidence} addResidence={addResidence} />}\n\n")

new_text = new_text.replace(text[rp_start:rp_end], "            {/* Tab Content: Reports */}\n            {activeTab === 'reports' && <ReportsTab reports={reports} residences={residences} events={events} addReport={addReport} loading={loading} />}\n\n        </div >\n    );\n};\n")

with open(filepath, "w", encoding="utf-8", newline="\n") as f:
    f.write(new_text)

print("Split finished.")
