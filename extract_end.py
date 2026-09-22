import json

log_file = r'C:\Users\chatt\.gemini\antigravity-ide\brain\3ff018ad-7c10-40a7-8e74-5163b91f4de5\.system_generated\logs\transcript_full.jsonl'
output_file = r'C:\Users\chatt\Desktop\ECO-BEM\extracted_end.txt'

html_lines = []
with open(log_file, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            entry = json.loads(line.strip())
            if entry.get('type') == 'VIEW_FILE' and 'index.html' in entry.get('content', '') and 'T09:' in entry.get('created_at', ''):
                content = entry['content']
                # Try to extract the lines
                lines = content.split('\n')
                if 'Showing lines' in content:
                    for l in lines:
                        if ':' in l:
                            html_lines.append(l)
                    if html_lines:
                        break
        except:
            continue

if html_lines:
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(html_lines))
    print(f"Extracted {len(html_lines)} lines to file.")
else:
    print("Could not find a view_file for the end of index.html")
