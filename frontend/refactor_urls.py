import re

FILE_PATH = "d:\\Manifest System\\frontend\\modules\\registration\\RegistrationContext.tsx"

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Modals replacement
modals = [
    ('isAddStationOpen', 'add-station'),
    ('isAddParkingOpen', 'add-parking'),
    ('isAddEntrantOpen', 'add-entrant'),
    ('isAddVehicleOpen', 'add-vehicle'),
    ('isAddPassengerOpen', 'add-passenger'),
    ('isAddChildrenOpen', 'add-children'),
    ('isAddEventOpen', 'add-event'),
    ('showHighlights', 'highlights')
]

for var_name, url_mapped_name in modals:
    setter_name = 'set' + var_name[0].upper() + var_name[1:]
    if var_name == 'showHighlights':
        setter_name = 'setShowHighlights'

    pattern = r"const\s+\[" + var_name + r",\s*" + setter_name + r"\]\s*=\s*useState(?:<boolean>)?\((?:false|true)\);"
    
    replacement = f"""  const {var_name} = searchParams.get('modal') === '{url_mapped_name}';
  const {setter_name} = (isOpen: boolean) => {{
    setSearchParams(prev => {{
      if (isOpen) prev.set('modal', '{url_mapped_name}');
      else prev.delete('modal');
      return prev;
    }});
  }};"""
    content = re.sub(pattern, replacement, content)

# 2. Hierarchy URL Sync (Events, Stations, Vehicles)
hierarchy = [
    ('selectedLogisticsEvent', 'eventId', 'MinistryEvent'),
    ('selectedStation', 'stationId', 'ExtendedStation'),
    ('selectedVehicle', 'vehicleId', 'Vehicle')
]

for var_name, param_expr, type_expr in hierarchy:
    setter_name = 'set' + var_name[0].upper() + var_name[1:]
    
    pattern_hook = r"const\s+\[" + var_name + r",\s*" + setter_name + r"\]\s*=\s*useState<" + type_expr + r"\s*\|\s*null>\(null\);"
    
    replacement_hook = f"""  const [{var_name}, _{setter_name}] = useState<{type_expr} | null>(null);
  
  const {setter_name} = (obj: {type_expr} | null | ((prev: {type_expr} | null) => {type_expr} | null)) => {{
    if (obj && typeof obj !== 'function') {{
       setSearchParams(prev => {{
         prev.set('{param_expr}', (obj as {type_expr}).id);
         if ('{param_expr}' === 'eventId') {{ prev.delete('stationId'); prev.delete('vehicleId'); }}
         if ('{param_expr}' === 'stationId') {{ prev.delete('vehicleId'); }}
         return prev;
       }});
    }} else if (!obj) {{
       setSearchParams(prev => {{ prev.delete('{param_expr}'); return prev; }});
    }}
    _{setter_name}(obj);
  }};"""

    content = re.sub(pattern_hook, replacement_hook, content)

# 3. Add the useEffect to react to URL back-button / direct linking
use_effect_code = """
  // Sync drill-down state with URL parameters (for direct linking & back button)
  useEffect(() => {
    const urlEventId = searchParams.get('eventId');
    if (urlEventId && (!selectedLogisticsEvent || selectedLogisticsEvent.id !== urlEventId)) {
       const found = events.find(e => e.id === urlEventId);
       if (found) _{setSelectedLogisticsEvent}(found);
    } else if (!urlEventId && selectedLogisticsEvent) {
       _{setSelectedLogisticsEvent}(null);
    }
    
    const urlStationId = searchParams.get('stationId');
    if (urlStationId && (!selectedStation || selectedStation.id !== urlStationId)) {
       const found = stations.find(s => s.id === urlStationId);
       if (found) _{setSelectedStation}(found);
    } else if (!urlStationId && selectedStation) {
       _{setSelectedStation}(null);
    }
    
    const urlVehicleId = searchParams.get('vehicleId');
    if (urlVehicleId && (!selectedVehicle || selectedVehicle.id !== urlVehicleId)) {
       const found = vehicles.find(v => v.id === urlVehicleId);
       if (found) _{setSelectedVehicle}(found);
    } else if (!urlVehicleId && selectedVehicle) {
       _{setSelectedVehicle}(null);
    }
  }, [searchParams, events, stations, vehicles]);
""".replace("_{setSelectedLogisticsEvent}", "_setSelectedLogisticsEvent").replace("_{setSelectedStation}", "_setSelectedStation").replace("_{setSelectedVehicle}", "_setSelectedVehicle")

insert_marker = r"const \[vehicles, setVehicles\] = useState<Vehicle\[\]>\(\[\]\);"
content = re.sub(insert_marker, f"const [vehicles, setVehicles] = useState<Vehicle[]>([]);{use_effect_code}", content)


with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("success")
