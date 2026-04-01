import sys

filepath = r"d:\Manifest System\frontend\components\FollowUpDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    text = f.read()

# 1. ServicesList
svc_start_str = "    const ServicesList = () => ("
svc_end_str = "    /** UPDATED EVENT DETAIL VIEW WITH ATTENDEES TAB */"

svc_start_idx = text.find(svc_start_str)
svc_end_idx = text.find(svc_end_str)

if svc_start_idx != -1 and svc_end_idx != -1:
    svc_code = text[svc_start_idx:svc_end_idx]
    
    new_call = "    const renderedServicesList = <ServicesList services={services} souls={souls} setSelectedEventId={setSelectedEventId} />;\n\n"
    text = text[:svc_start_idx] + new_call + text[svc_end_idx:]
    
    # modify the extracted function signature
    extracted_svc = svc_code.replace("const ServicesList = () => (", "const ServicesList = ({ services, souls, setSelectedEventId }: any) => (")
    # update usage
    text = text.replace("{activeTab === 'services' && <ServicesList />}", "{activeTab === 'services' && renderedServicesList}")
    
    text += "\n" + extracted_svc
else:
    print("ServicesList boundaries not found!")

# 2. EventsList
ev_start_str = "    const EventsList = () => {"
ev_end_str = "    const SoulsDatabase = () => ("

ev_start_idx = text.find(ev_start_str)
ev_end_idx = text.find(ev_end_str)

if ev_start_idx != -1 and ev_end_idx != -1:
    ev_code = text[ev_start_idx:ev_end_idx]
    
    new_call = "    const renderedEventsList = <EventsList events={events} setSelectedEventId={setSelectedEventId} />;\n\n"
    text = text[:ev_start_idx] + new_call + text[ev_end_idx:]
    
    # modify the extracted function signature
    extracted_ev = ev_code.replace("const EventsList = () => {", "const EventsList = ({ events, setSelectedEventId }: any) => {")
    # update usage
    text = text.replace("{activeTab === 'events' && <EventsList />}", "{activeTab === 'events' && renderedEventsList}")
    
    text += "\n" + extracted_ev
else:
    print("EventsList boundaries not found!")


with open(filepath, "w", encoding="utf-8", newline="") as f:
    f.write(text)

print("Extraction 2 applied.")
