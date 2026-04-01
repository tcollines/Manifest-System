import os
import re

filepath = r"d:\Manifest System\frontend\components\FollowUpDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    code = f.read().replace('\r\n', '\n')

# 1. Extract ServicesList
# Find starting def
svc_start = code.find("    const ServicesList = () => (")
svc_end = code.find("    );\n\n\n\n\n    /** UPDATED EVENT DETAIL VIEW WITH ATTENDEES TAB */")

if svc_start != -1 and svc_end != -1:
    # include the `);` in the end
    svc_end_actual = code.find("    );", svc_end) + 6
    svc_code = code[svc_start:svc_end_actual]
    
    # Replace in file with a prop-ified call
    new_call = "    const renderedServicesList = <ServicesList services={services} souls={souls} setSelectedEventId={setSelectedEventId} />;"
    
    # Strip the original block
    code = code[:svc_start] + new_call + code[svc_end_actual:]
    
    # Prepare the extracted component
    # We need to change `const ServicesList = () => (` to `const ServicesList = ({ services, souls, setSelectedEventId }: any) => (`
    extracted_svc = svc_code.replace("const ServicesList = () => (", "const ServicesList = ({ services, souls, setSelectedEventId }: any) => (").lstrip()
    
    # Also replace where it's called
    code = code.replace("{activeTab === 'services' && <ServicesList />}", "{activeTab === 'services' && renderedServicesList}")
    
    code += "\n\n" + extracted_svc

# 2. Extract EventsList
ev_start = code.find("    const EventsList = () => {")
# It ends right before `    const SoulsDatabase = () => (`
ev_end = code.find("    const SoulsDatabase = () => (")

if ev_start != -1 and ev_end != -1:
    ev_code = code[ev_start:ev_end]
    
    new_call = "    const renderedEventsList = <EventsList events={events} setSelectedEventId={setSelectedEventId} />;"
    code = code[:ev_start] + new_call + code[ev_end:]
    
    extracted_ev = ev_code.replace("const EventsList = () => {", "const EventsList = ({ events, setSelectedEventId }: any) => {").lstrip()
    
    code = code.replace("{activeTab === 'events' && <EventsList />}", "{activeTab === 'events' && renderedEventsList}")
    
    code += "\n\n" + extracted_ev

# 3. Extract FirstTimersView
ft_start = code.find("    const FirstTimersView = () => {")
ft_end = code.find("    return (\n        <div className=\"p-6 md:p-10 max-w-7xl mx-auto space-y-8 min-h-screen pb-24\">")

if ft_start != -1 and ft_end != -1:
    ft_code = code[ft_start:ft_end]
    
    new_call = "    const renderedFirstTimersView = <FirstTimersView showToast={showToast} />;"
    code = code[:ft_start] + new_call + code[ft_end:]
    
    extracted_ft = ft_code.replace("const FirstTimersView = () => {", "const FirstTimersView = ({ showToast }: any) => {").lstrip()
    
    code = code.replace("{activeTab === 'first-timers' && canViewDatabase && <FirstTimersView />}", "{activeTab === 'first-timers' && canViewDatabase && renderedFirstTimersView}")
    
    code += "\n\n" + extracted_ft


with open(filepath, "w", encoding="utf-8", newline="") as f:
    f.write(code)

print("Extraction script applied.")
