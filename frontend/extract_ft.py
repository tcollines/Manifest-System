import sys

filepath = r"d:\Manifest System\frontend\components\FollowUpDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    text = f.read()

# find FirstTimersView
start_str = "    const FirstTimersView = () => {"
end_str = "    return (\n        <div className=\"p-6 md:p-10 max-w-7xl mx-auto space-y-8 min-h-screen pb-24\">"

start_idx = text.find(start_str)
end_idx = text.find(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find start or end index.")
    sys.exit(1)

# Extract code
ft_code = text[start_idx:end_idx]

# Replace inside FollowUpDashboard
new_call = "    const renderedFirstTimersView = <FirstTimersView showToast={showToast} />;\n\n"
new_text = text[:start_idx] + new_call + text[end_idx:]

extracted_ft = ft_code.replace("const FirstTimersView = () => {", "const FirstTimersView = ({ showToast }: any) => {")

new_text = new_text.replace("{activeTab === 'first-timers' && canViewDatabase && <FirstTimersView />}", "{activeTab === 'first-timers' && canViewDatabase && renderedFirstTimersView}")

new_text += "\n" + extracted_ft

with open(filepath, "w", encoding="utf-8", newline="") as f:
    f.write(new_text)

print("FirstTimersView extracted successfully!")
