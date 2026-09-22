import json
import re

log_file = r'C:\Users\chatt\.gemini\antigravity-ide\brain\3ff018ad-7c10-40a7-8e74-5163b91f4de5\.system_generated\logs\transcript_full.jsonl'
output_file = r'C:\Users\chatt\Desktop\ECO-BEM\index_original.html'

html_lines = []

with open(log_file, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            entry = json.loads(line.strip())
            if entry.get('type') == 'VIEW_FILE' and 'index.html' in entry.get('content', ''):
                content = entry['content']
                if 'Showing lines 1 to 800' in content or 'Showing lines 1 to 825' in content:
                    # Extract the lines
                    lines = content.split('\n')
                    in_code = False
                    for l in lines:
                        if re.match(r'^\d+:\s', l):
                            html_lines.append(l.split(': ', 1)[1])
                    if html_lines:
                        break
        except:
            continue

if html_lines:
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(html_lines))
    print(f"Extracted {len(html_lines)} lines!")
else:
    print("Could not find the original view_file log.")
