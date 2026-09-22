import os

source = r'C:\Users\chatt\.gemini\antigravity-ide\brain\3ff018ad-7c10-40a7-8e74-5163b91f4de5\scratch\rebuild_full_index.py'
target = r'C:\Users\chatt\Desktop\ECO-BEM\index.html'

with open(source, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the HTML literal from rebuild_full_index.py
start_marker = 'full_html = """'
end_marker = '"""\n\nwith open(file_path'
start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    html = content[start_idx + len(start_marker) : end_idx]
    
    # Add style_v2.CSS
    html = html.replace('<link rel="stylesheet" href="./style.CSS">', '<link rel="stylesheet" href="./style.CSS">\n<link rel="stylesheet" href="./style_v2.CSS">')
    
    # Fix the bottom scripts. We find '<!-- Scripts -->' and replace everything after it.
    scripts_start = html.find('<!-- Scripts -->')
    if scripts_start != -1:
        correct_bottom = """<!-- Scripts -->
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
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
        html = html[:scripts_start] + correct_bottom
    
    with open(target, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Successfully built the ULTIMATE index.html!")
else:
    print("Could not parse rebuild_full_index.py")
