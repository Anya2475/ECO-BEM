import os

base_file = r'C:\Users\chatt\Desktop\ECO-BEM\index.html'
script_file = r'C:\Users\chatt\.gemini\antigravity-ide\brain\3ff018ad-7c10-40a7-8e74-5163b91f4de5\scratch\rebuild_full_index.py'

with open(base_file, 'r', encoding='utf-8') as f:
    html = f.read()

# Add style_v2.CSS
if 'style_v2.CSS' not in html:
    html = html.replace('<link rel="stylesheet" href="./style.CSS">', '<link rel="stylesheet" href="./style.CSS">\n<link rel="stylesheet" href="./style_v2.CSS">')

# Extract Annals overlay from rebuild_full_index.py
with open(script_file, 'r', encoding='utf-8') as f:
    script_content = f.read()

start_annals = script_content.find('<!-- Annals (Past Papers) Overlay -->')
end_annals = script_content.find('<!-- Sync Overlay -->')
annals_overlay = script_content[start_annals:end_annals] + "\n" if start_annals != -1 else ""

# Inject Annals overlay before <!-- Sync --> (which already exists in the file!)
sync_marker = '<!-- Sync -->'
if sync_marker in html:
    html = html.replace(sync_marker, annals_overlay + "\n" + sync_marker)
else:
    # If not found, inject before the bottom scripts
    script_marker = '<script src="./database.js"></script>'
    html = html.replace(script_marker, annals_overlay + "\n" + script_marker)

# Replace app.js with app.v9.js to ensure the new JS logic runs
if '<script src="./app.js"></script>' in html:
    html = html.replace('<script src="./app.js"></script>', '<script src="./eco-mvs.js"></script>\n<script src="./annalsData.js?v=2"></script>\n<script>function showToast(msg) { toast(msg, \'info\'); }</script>\n<script src="./app.v9.js"></script>')

with open(base_file, 'w', encoding='utf-8') as f:
    f.write(html)

print("SUCCESS: Injected Annals overlay into the original 102KB index.html!")
