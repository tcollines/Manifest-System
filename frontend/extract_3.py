import sys

filepath = r"d:\Manifest System\frontend\components\FollowUpDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    text = f.read()

# 1. EventDetailView
evd_start_str = "    /** UPDATED EVENT DETAIL VIEW WITH ATTENDEES TAB */\n    const EventDetailView = () => {"
evd_end_str = "    const SoulsDatabase = () => ("

evd_start_idx = text.find(evd_start_str)
evd_end_idx = text.find(evd_end_str)

if evd_start_idx != -1 and evd_end_idx != -1:
    evd_code = text[evd_start_idx:evd_end_idx]
    
    new_call = "    const renderedEventDetailView = <EventDetailView events={events} selectedEventId={selectedEventId} souls={souls} setSelectedEventId={setSelectedEventId} handleCopyLink={handleCopyLink} copiedLinkId={copiedLinkId} setShowAddSoulForm={setShowAddSoulForm} showConfirm={showConfirm} showToast={showToast} />;\n\n"
    text = text[:evd_start_idx] + new_call + text[evd_end_idx:]
    
    extracted_evd = evd_code.replace("const EventDetailView = () => {", "const EventDetailView = ({ events, selectedEventId, souls, setSelectedEventId, handleCopyLink, copiedLinkId, setShowAddSoulForm, showConfirm, showToast }: any) => {")
    text = text.replace("<EventDetailView />", "renderedEventDetailView")
    text += "\n" + extracted_evd
else:
    print("EventDetailView boundaries not found!")


# 2. SoulsDatabase
sd_start_str = "    const SoulsDatabase = () => ("
sd_end_str = "    const SoulDetailView = () => {"

sd_start_idx = text.find(sd_start_str)
sd_end_idx = text.find(sd_end_str)

if sd_start_idx != -1 and sd_end_idx != -1:
    sd_code = text[sd_start_idx:sd_end_idx]
    
    new_call = "    const renderedSoulsDatabase = <SoulsDatabase souls={souls} events={events} services={services} dbEventFilter={dbEventFilter} setDbEventFilter={setDbEventFilter} handleViewSoul={handleViewSoul} showConfirm={showConfirm} showToast={showToast} />;\n\n"
    text = text[:sd_start_idx] + new_call + text[sd_end_idx:]
    
    extracted_sd = sd_code.replace("const SoulsDatabase = () => (", "const SoulsDatabase = ({ souls, events, services, dbEventFilter, setDbEventFilter, handleViewSoul, showConfirm, showToast }: any) => (")
    text = text.replace("{activeTab === 'database' && canViewDatabase && (viewMode === 'list' ? <SoulsDatabase /> : <SoulDetailView />)}", "{activeTab === 'database' && canViewDatabase && (viewMode === 'list' ? renderedSoulsDatabase : <SoulDetailView />)}")
    
    text += "\n" + extracted_sd
else:
    print("SoulsDatabase boundaries not found!")


with open(filepath, "w", encoding="utf-8", newline="") as f:
    f.write(text)

print("Extraction 3 applied.")
