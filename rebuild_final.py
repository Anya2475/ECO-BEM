import os

html_file = r'C:\Users\chatt\Desktop\ECO-BEM\index.html'
script_file = r'C:\Users\chatt\.gemini\antigravity-ide\brain\3ff018ad-7c10-40a7-8e74-5163b91f4de5\scratch\rebuild_full_index.py'

# 1. Read index.html (the 737 line perfect base)
with open(html_file, 'r', encoding='utf-8') as f:
    html = f.read()

# 2. Add style_v2.CSS
if 'style_v2.CSS' not in html:
    html = html.replace('<link rel="stylesheet" href="style.CSS">', '<link rel="stylesheet" href="style.CSS">\n    <link rel="stylesheet" href="style_v2.CSS">')

# 3. Read rebuild_full_index.py to extract overlays
with open(script_file, 'r', encoding='utf-8') as f:
    script_content = f.read()

start_marker = "<!-- Auth Overlay -->"
end_marker = "<!-- Scripts -->"

start_idx = script_content.find(start_marker)
end_idx = script_content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    overlays_html = script_content[start_idx:end_idx]
else:
    print("Failed to find overlays in script.")
    exit(1)

# 4. Inject overlays and fix scripts at the bottom
bottom_marker = '<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>'
new_bottom = overlays_html + "\n\n    " + bottom_marker

if bottom_marker in html:
    html = html.replace(bottom_marker, new_bottom)

# Replace old scripts with new ones
old_scripts = """    <script>if(localStorage.getItem("theme")==="dark"){localStorage.removeItem("theme");}</script>
    <script src="app.js"></script>
</body>"""

new_scripts = """    <script>if(localStorage.getItem("theme")==="dark"){localStorage.removeItem("theme");}</script>
    <script src="./database.js"></script>
    <script src="./eco-mvs.js"></script>
    <script src="./annalsData.js?v=2"></script>
    <script>
      // showToast compatibility shim
      function showToast(msg) { toast(msg, 'info'); }
    </script>
    <script src="./app.v9.js"></script>
</body>"""

if old_scripts in html:
    html = html.replace(old_scripts, new_scripts)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)

print("index.html fully rebuilt with correct map structure AND new overlays!")
