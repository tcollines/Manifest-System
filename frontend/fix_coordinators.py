import os
import re

filepath = r"d:\Manifest System\frontend\components\TransportationDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    code = f.read().replace('\r\n', '\n')

# Target: The bad inner body of CoordinatorsTab (the stale wrapper included by the extraction script)
bad_start = """    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
{activeTab === 'coordinators' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">"""

# Find where CoordinatorsTab body ends
# The correct content starts after the bad_start, with:
good_body_start = """                    {/* List */}"""

# It ends before the stale closing )} and the extra </div>
# Let's look for the exact closing sequence
bad_end = """                </div >
            )}
"""

# Find the right boundary: after last coordinator tab items, the function ends with:
# closing_pattern = "        </div>\n    );\n};\n"

# Strategy: replace the entire body preserving what's inside the stale wrapper
good_start_marker = "}: any) => {\n    return (\n        <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-8\">\n{activeTab === 'coordinators' && (\n                <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-8\">"
good_end_marker = """                </div >
            )}
"""

correct_start = "}: any) => {\n    return (\n        <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-8\">"
correct_end = ""

if good_start_marker in code and good_end_marker in code:
    code = code.replace(good_start_marker, correct_start, 1)
    
    # Now remove the stale closing: "                </div >\n            )}\n" from within CoordinatorsTab
    # This is the closing of `{activeTab === 'coordinators' && ( <div className="grid...">` wrapper
    # We need to find it inside CoordinatorsTab context specifically
    # Since it's just after the last `</div >` for the locked state panel
    code = code.replace(good_end_marker, "\n", 1)
    
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        f.write(code)
    print("Fixed CoordinatorsTab JSX structure!")
else:
    print("Pattern not found")
    print("start:", good_start_marker in code)
    print("end:", good_end_marker in code)
