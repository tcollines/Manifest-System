import os

filepath = r"d:\Manifest System\frontend\components\TransportationDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    code = f.read().replace('\r\n', '\n')

delimiter_start = "            {/* === COORDINATORS TAB === */}"
delimiter_end = "\n\n            {/* === STAGE DETAILS TAB === */}"

if delimiter_start in code and delimiter_end in code:
    parts_before = code.split(delimiter_start)
    parts_after = parts_before[1].split(delimiter_end)
    
    target_jsx_block = parts_after[0]  # everything between COORDINATORS and STAGES tab comments
    
    props_usage = """                    <CoordinatorsTab
                        coordinators={coordinators}
                        selectedEvent={selectedEvent}
                        selectedEventId={selectedEventId}
                        dbStations={dbStations}
                        setDbStations={setDbStations}
                        isEventLocked={isEventLocked}
                        handleDeleteCoordinator={handleDeleteCoordinator}
                        handleAddCoordinator={handleAddCoordinator}
                        showToast={showToast}
                        showHighlights={showHighlights}
                        setShowHighlights={setShowHighlights}
                        newCoordinator={newCoordinator}
                        setNewCoordinator={setNewCoordinator}
                        formRoleType={formRoleType}
                        setFormRoleType={setFormRoleType}
                    />"""

    coordinator_tab_def = f"""
const CoordinatorsTab = ({{
    coordinators,
    selectedEvent,
    selectedEventId,
    dbStations,
    setDbStations,
    isEventLocked,
    handleDeleteCoordinator,
    handleAddCoordinator,
    showToast,
    showHighlights,
    setShowHighlights,
    newCoordinator,
    setNewCoordinator,
    formRoleType,
    setFormRoleType
}}: any) => {{
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
{target_jsx_block.lstrip()}
    );
}};
"""

    new_coordinator_section = f"""            {{/* === COORDINATORS TAB === */}}
            {{activeTab === 'coordinators' && (
{props_usage}
            )}}"""

    final_code = code.replace(
        delimiter_start + target_jsx_block + delimiter_end,
        new_coordinator_section + delimiter_end
    )
    
    # Remove the inlined `{activeTab === 'coordinators' && (` wrapper since we moved it to our injected props.
    # The props_usage already uses `<CoordinatorsTab.../>` without re-wrapping it.
    # ... actually our replacement already handles this correctly.
    
    final_code = final_code.replace(
        "export default TransportationDashboard;",
        coordinator_tab_def + "\nexport default TransportationDashboard;"
    )
    
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        f.write(final_code)
    print("Successfully extracted CoordinatorsTab!")
else:
    print("Could not find delimiters.")
    print("start:", delimiter_start in code)
    print("end:", delimiter_end in code)
    # Dump nearby content for debugging
    idx = code.find(delimiter_start[:20])
    print("context:", repr(code[idx:idx+100]))
