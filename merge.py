import re

with open(r'c:\Users\chatt\Desktop\ECO-BEM\true_original_index.html', 'r', encoding='utf-8') as f:
    top = f.read()

with open(r'c:\Users\chatt\Desktop\ECO-BEM\extracted_end.txt', 'r', encoding='utf-8') as f:
    bottom_raw = f.read()

# Filter bottom_raw to only include the html lines
bottom_lines = []
for line in bottom_raw.split('\n'):
    if re.match(r'^\d+:\s', line):
        bottom_lines.append(line.split(': ', 1)[1])

full_html = top + '\n' + '\n'.join(bottom_lines)

with open(r'c:\Users\chatt\Desktop\ECO-BEM\merged_index.html', 'w', encoding='utf-8') as f:
    f.write(full_html)
