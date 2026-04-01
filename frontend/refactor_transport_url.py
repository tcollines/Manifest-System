import os

filepath = r"d:\Manifest System\frontend\components\TransportationDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    code = f.read().replace('\r\n', '\n')

target_import = "import { useNavigate } from 'react-router-dom';"
replacement_import = "import { useNavigate, useSearchParams } from 'react-router-dom';"

target_state = "    const [selectedEventId, setSelectedEventId] = useState<string>('');"
replacement_state = """    const [searchParams, setSearchParams] = useSearchParams();
    const selectedEventId = searchParams.get('eventId') || '';
    const setSelectedEventId = (id: string) => {
        setSearchParams(prev => {
            if (id) prev.set('eventId', id);
            else prev.delete('eventId');
            return prev;
        }, { replace: true });
    };"""

if target_import in code and target_state in code:
    code = code.replace(target_import, replacement_import)
    code = code.replace(target_state, replacement_state)
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        f.write(code)
    print("Successfully elevated selectedEventId to URL in TransportationDashboard!")
else:
    print("Could not find targets. Import:", target_import in code, "State:", target_state in code)
