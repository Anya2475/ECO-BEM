import re
import os

app_js_path = r"C:\Users\chatt\Desktop\ECO-BEM\app_v12.js"
index_html_path = r"C:\Users\chatt\Desktop\ECO-BEM\index.html"
js_dir = r"C:\Users\chatt\Desktop\ECO-BEM\js"

with open(app_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the markers and their target files
sections = [
    ("/* ═══════════════════════════════════════════════════════", "js/core.js"),
    ("/* ═══ Sound Engine ═══ */", "js/core.js"),
    ("/* ═══ Toast ═══ */", "js/core.js"),
    ("/* ═══ IndexedDB ═══ */", "js/db.js"),
    ("/* ═══ User Name ═══ */", "js/auth.js"),
    ("/* ═══ Math Rendering ═══ */", "js/core.js"),
    ("/* ═══════════════════════════════════════════════════════", "skip"), # Top of LMS
    ("/* ═══ LMS — Learning Path ═══ */", "js/lessons.js"),
    ("/* ═══ Archive ═══ */", "js/archive.js"),
    ("/* ═══ Dashboard ═══ */", "js/dashboard.js"),
    ("/* ═══ AI Teacher ═══ */", "js/ai.js"),
    ("/* ═══ Zen ═══ */", "js/zen.js"),
    ("/* ═══ Sync Panel ═══ */", "js/sync.js"),
    ("/* ═══ Analytics ═══ */", "js/dashboard.js"),
    ("/* ═══ Notifications Panel ═══ */", "js/ui.js"),
    ("/* ═══ Core Functions ═══ */", "js/ui.js"),
    ("/* ═══ ESC Close ═══ */", "js/ui.js"),
    ("/* ═══ Global Error Handler ═══ */", "js/main.js"),
    ("/* ═══ Auto-Init ═══ */", "js/main.js"),
    ("/* ══════════════ Avatar & Dream Logic ══════════════ */", "js/auth.js"),
    ("/* ══════════════ AUTH & DB SYNC LOGIC ══════════════ */", "js/auth.js"),
    ("// ═══════════════ BEM ANNALS LOGIC ═══════════════", "js/annals.js"),
    ("/* ═══ Custom Select Dropdown UI ═══ */", "js/ui.js"),
    ("/* ═══════════════════════════════════════════════════\n   ═══════════════════════════════════════════════════ */", "skip")
]

# Find all occurrences of the section headers
indices = []
for marker, filename in sections:
    idx = content.find(marker)
    if idx != -1:
        indices.append((idx, filename))

# Sort by index
indices.sort(key=lambda x: x[0])

# Split content
files_content = {}
# Order in which files should be included in HTML
file_order = ["js/core.js", "js/db.js", "js/auth.js", "js/ui.js", "js/sync.js", "js/dashboard.js", "js/lessons.js", "js/archive.js", "js/ai.js", "js/zen.js", "js/annals.js", "js/main.js"]

for f in file_order:
    files_content[f] = ""

for i in range(len(indices)):
    start_idx = indices[i][0]
    end_idx = indices[i+1][0] if i + 1 < len(indices) else len(content)
    filename = indices[i][1]
    
    if filename != "skip":
        files_content[filename] += content[start_idx:end_idx] + "\n\n"

# Write files
for filename, text in files_content.items():
    path = os.path.join(r"C:\Users\chatt\Desktop\ECO-BEM", filename)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text.strip() + "\n")
    print(f"Written {filename}")

# Update index.html
with open(index_html_path, 'r', encoding='utf-8') as f:
    html = f.read()

script_tags = ""
for filename in file_order:
    script_tags += f'  <script src="./{filename}?v=1"></script>\n'

old_tag = '<script src="./app_v12.js?v=7"></script>'
if old_tag in html:
    html = html.replace(old_tag, script_tags.strip())
    with open(index_html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Updated index.html")
else:
    print("Could not find old script tag in index.html")
