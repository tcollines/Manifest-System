import os

filepath = r"d:\Manifest System\frontend\components\TransportationDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    code = f.read().replace('\r\n', '\n')

# Check what import line looks like
import_line = None
for line in code.split('\n'):
    if 'react-router-dom' in line:
        import_line = line
        break
print("Found import:", repr(import_line))

# Check what state line looks like
state_line = None
for line in code.split('\n'):
    if 'selectedEventId' in line and 'useState' in line:
        state_line = line
        break
print("Found state:", repr(state_line))
