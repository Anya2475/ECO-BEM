import os

merged_file = r'C:\Users\chatt\Desktop\ECO-BEM\merged_index.html'
index_file = r'C:\Users\chatt\Desktop\ECO-BEM\index.html'
script_file = r'C:\Users\chatt\.gemini\antigravity-ide\brain\3ff018ad-7c10-40a7-8e74-5163b91f4de5\scratch\rebuild_full_index.py'

with open(merged_file, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add style_v2.CSS if missing
if 'style_v2.CSS' not in html:
    html = html.replace('<link rel="stylesheet" href="./style.CSS">', '<link rel="stylesheet" href="./style.CSS">\n<link rel="stylesheet" href="./style_v2.CSS">')

# 2. Extract Annals overlay from rebuild_full_index.py
with open(script_file, 'r', encoding='utf-8') as f:
    script_content = f.read()
start_annals = script_content.find('<!-- Annals (Past Papers) Overlay -->')
end_annals = script_content.find('<!-- Sync Overlay -->')
annals_overlay = script_content[start_annals:end_annals] + "\n" if start_annals != -1 else ""

# 3. Inject Annals overlay before <!-- Sync -->
sync_marker = '<!-- Sync -->'
if sync_marker in html and 'ov-annals' not in html:
    html = html.replace(sync_marker, annals_overlay + "\n" + sync_marker)

# 4. Replace bottom scripts with the correct ones
# In merged_index.html, it probably has:
# <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
# <script>if(localStorage.getItem("theme")==="dark"){localStorage.removeItem("theme");}</script>
# <script src="./database.js"></script>
# <script src="./app.js"></script>

scripts_start = html.find('<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>')
if scripts_start != -1:
    correct_scripts = """<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
<script>if(localStorage.getItem("theme")==="dark"){localStorage.removeItem("theme");}</script>
<script src="./database.js"></script>
<script src="./eco-mvs.js"></script>
<script src="./annalsData.js?v=2"></script>
<script>
  // showToast compatibility shim
  function showToast(msg) { toast(msg, 'info'); }
</script>
<script src="./app.v9.js"></script>
</body>
</html>"""
    html = html[:scripts_start] + correct_scripts

with open(index_file, 'w', encoding='utf-8') as f:
    f.write(html)

print("SUCCESS: Final fix applied using merged_index.html as base!")
