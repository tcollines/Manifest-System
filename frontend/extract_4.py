import sys
import re

filepath = r"d:\Manifest System\frontend\components\ResidentDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    text = f.read()

# --- 1. OVERVIEW TAB ---
ov_start_str = "            {/* Tab Content: Overview */}\n            {activeTab === 'overview' && ("
ov_end_str = "            {/* Tab Content: Residences */}\n"

ov_start = text.find(ov_start_str)
ov_end = text.find(ov_end_str)

if ov_start != -1 and ov_end != -1:
    ov_jsx = text[ov_start + len(ov_start_str):ov_end]
    # The last characters are typically "    )}\n\n"
    # We need to trim the trailing ")\n"
    ov_jsx = ov_jsx.rstrip()
    if ov_jsx.endswith(")}"):
        ov_jsx = ov_jsx[:-2]
    
    # Overview needs reports, residences, totalSoulsWon, totalResidences, recentReports
    ov_comp = """
const OverviewTab = ({ reports, residences, totalSoulsWon, totalResidences, recentReports }: any) => (
""" + ov_jsx + ");\n"
    
    text = text[:ov_start] + "            {/* Tab Content: Overview */}\n            {activeTab === 'overview' && <OverviewTab reports={reports} residences={residences} totalSoulsWon={totalSoulsWon} totalResidences={totalResidences} recentReports={recentReports} />}\n\n" + text[ov_end:]
    text += "\n" + ov_comp


# --- 2. REPORTS TAB ---
rp_start_str = "            {/* Tab Content: Reports */}\n            {\n                activeTab === 'reports' && ("
if text.find(rp_start_str) == -1:
    rp_start_str = "            {/* Tab Content: Reports */}\n            {activeTab === 'reports' && ("
rp_end_str = "        </div >\n    );\n};\n"

rp_start = text.find(rp_start_str)
rp_end = text.rfind(rp_end_str)

if rp_start != -1 and rp_end != -1:
    rp_jsx = text[rp_start + len(rp_start_str):rp_end]
    rp_jsx = rp_jsx.rstrip()
    if rp_jsx.endswith(")}"):
        rp_jsx = rp_jsx[:-2]
    elif rp_jsx.endswith(")"):
        rp_jsx = rp_jsx[:-1]
        
    # We will extract the state for reports
    # It is: showAddReport, newReport, handleAddReport
    
    state_start = text.find("    const [showAddReport, setShowAddReport] = useState(false);")
    state_end = text.find("    const [addStep, setAddStep] = useState<1 | 2>(1);")
    
    report_state_1 = ""
    if state_start != -1 and state_end != -1:
        report_state_1 = text[state_start:state_end]
        text = text[:state_start] + text[state_end:]
        
    state2_start = text.find("    const [newReport, setNewReport] = useState<Partial<ResidenceOutreachReport>>(")
    state2_end = text.find("    const [selectedResidenceForDetails, setSelectedResidenceForDetails] = useState<Residence | null>(null);")
    
    report_state_2 = ""
    if state2_start != -1 and state2_end != -1:
        report_state_2 = text[state2_start:state2_end]
        text = text[:state2_start] + text[state2_end:]
        
    handler_start = text.find("    const handleAddReport = async (e: React.FormEvent) => {")
    handler_end = text.find("    if (loading && residences.length === 0) {")
    
    report_handler = ""
    if handler_start != -1 and handler_end != -1:
        report_handler = text[handler_start:handler_end]
        text = text[:handler_start] + text[handler_end:]

    rp_comp = """
const ReportsTab = ({ reports, residences, events, addReport, loading }: any) => {
""" + report_state_1 + report_state_2 + report_handler + """
    return (
""" + rp_jsx + """
    );
};
"""
    rp_start = text.find(rp_start_str) # Re-find because text index changed
    rp_end = text.rfind(rp_end_str)
    
    text = text[:rp_start] + "            {/* Tab Content: Reports */}\n            {activeTab === 'reports' && <ReportsTab reports={reports} residences={residences} events={events} addReport={addReport} loading={loading} />}\n\n" + text[rp_end:]
    text += "\n" + rp_comp


# --- 3. RESIDENCES TAB ---
rs_start_str = "            {/* Tab Content: Residences */}\n            {activeTab === 'residences' && ("
rs_end_str = "            {/* Tab Content: Reports */}\n"

rs_start = text.find(rs_start_str)
rs_end = text.find(rs_end_str)

if rs_start != -1 and rs_end != -1:
    rs_jsx = text[rs_start + len(rs_start_str):rs_end]
    rs_jsx = rs_jsx.rstrip()
    if rs_jsx.endswith(")}"):
        rs_jsx = rs_jsx[:-2]
        
    state_start = text.find("    const [showAddResidence, setShowAddResidence] = useState(false);")
    state_end = text.find("    useEffect(() => {")
    
    res_state = ""
    if state_start != -1 and state_end != -1:
        res_state = text[state_start:state_end]
        text = text[:state_start] + text[state_end:]
        
    handler_start = text.find("    const handleViewResidence = async (residence: Residence) => {")
    handler_end = text.find("    if (loading && residences.length === 0) {")
    
    res_handler = ""
    if handler_start != -1 and handler_end != -1:
        res_handler = text[handler_start:handler_end]
        text = text[:handler_start] + text[handler_end:]

    rs_comp = """
const ResidencesTab = ({ residences, reports, events, fetchResidenceMembers, deleteResidence, addResidence }: any) => {
""" + res_state + res_handler + """
    return (
""" + rs_jsx + """
    );
};
"""
    rs_start = text.find(rs_start_str)
    rs_end = text.find(rs_end_str)
    
    text = text[:rs_start] + "            {/* Tab Content: Residences */}\n            {activeTab === 'residences' && <ResidencesTab residences={residences} reports={reports} events={events} fetchResidenceMembers={fetchResidenceMembers} deleteResidence={deleteResidence} addResidence={addResidence} />}\n\n" + text[rs_end:]
    text += "\n" + rs_comp


with open(filepath, "w", encoding="utf-8", newline="") as f:
    f.write(text)

print("Extraction 4 applied.")
