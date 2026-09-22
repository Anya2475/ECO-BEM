import os

original = r'C:\Users\chatt\Desktop\ECO-BEM\index_original.html'
script_file = r'C:\Users\chatt\.gemini\antigravity-ide\brain\3ff018ad-7c10-40a7-8e74-5163b91f4de5\scratch\rebuild_full_index.py'
target = r'C:\Users\chatt\Desktop\ECO-BEM\index.html'

with open(original, 'r', encoding='utf-8') as f:
    html = f.read()

# Add style_v2.CSS if not there
if 'style_v2.CSS' not in html:
    html = html.replace('<link rel="stylesheet" href="./style.CSS">', '<link rel="stylesheet" href="./style.CSS">\n<link rel="stylesheet" href="./style_v2.CSS">')

# Extract Annals overlay from rebuild_full_index.py
with open(script_file, 'r', encoding='utf-8') as f:
    script_content = f.read()

start_annals = script_content.find('<!-- Annals (Past Papers) Overlay -->')
end_annals = script_content.find('<!-- Sync Overlay -->')
annals_overlay = script_content[start_annals:end_annals] + "\n" if start_annals != -1 else ""

# Inject Annals overlay before the bottom scripts
# We look for <script defer src="./lessonsData.js"></script> at the top, but we want the bottom scripts.
# The bottom scripts in index_original.html are:
# <script src="./database.js"></script>
# <script src="./app.js"></script>
# </body>
script_marker = '<script src="./database.js"></script>'
if script_marker in html:
    html = html.replace(script_marker, annals_overlay + "\n" + script_marker)

# Replace app.js with app.v9.js to ensure the new JS logic runs
if '<script src="./app.js"></script>' in html:
    html = html.replace('<script src="./app.js"></script>', '<script src="./eco-mvs.js"></script>\n<script src="./annalsData.js?v=2"></script>\n<script>function showToast(msg) { toast(msg, \'info\'); }</script>\n<script src="./app.v9.js"></script>')

with open(target, 'w', encoding='utf-8') as f:
    f.write(html)

print("SUCCESS: index.html has been perfectly rebuilt using index_original.html + Annals overlay + app.v9.js!")
