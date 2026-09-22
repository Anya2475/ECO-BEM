import json
import re

log_file = r'C:\Users\chatt\.gemini\antigravity-ide\brain\3ff018ad-7c10-40a7-8e74-5163b91f4de5\.system_generated\logs\transcript_full.jsonl'
output_file = r'C:\Users\chatt\Desktop\ECO-BEM\true_original_index.html'

html_lines = []

with open(log_file, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            entry = json.loads(line.strip())
            # Find the view_file of index.html that happened early in the session (09:53Z)
            if entry.get('type') == 'VIEW_FILE' and 'index.html' in entry.get('content', '') and 'T08:53:55Z' in entry.get('created_at', ''):
                content = entry['content']
                lines = content.split('\n')
                for l in lines:
                    if re.match(r'^\d+:\s', l):
                        html_lines.append(l.split(': ', 1)[1])
                if html_lines:
                    break
        except Exception as e:
            continue

if html_lines:
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(html_lines))
    print(f"Extracted {len(html_lines)} lines to true_original_index.html!")
else:
    print("Could not find the view_file log.")
