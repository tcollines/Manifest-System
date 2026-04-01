import codecs

with codecs.open(r"d:\Manifest System\frontend\tsc_error.txt", 'r', 'utf-16le') as f:
    text = f.read()

for i, line in enumerate(text.splitlines()):
    if "error TS" in line:
        print(line)
        # print couple lines around it
        start = max(0, i-2)
        end = min(len(text.splitlines()), i+3)
        for j in range(start, end):
            print(f"{j}: {text.splitlines()[j]}")
