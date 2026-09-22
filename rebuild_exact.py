import os

html_file = r'C:\Users\chatt\Desktop\ECO-BEM\index.html'
merged_file = r'C:\Users\chatt\Desktop\ECO-BEM\merged_index.html'
script_file = r'C:\Users\chatt\.gemini\antigravity-ide\brain\3ff018ad-7c10-40a7-8e74-5163b91f4de5\scratch\rebuild_full_index.py'

# 1. Read merged_index.html (the 825-line original file, cut off at ov-sync)
with open(merged_file, 'r', encoding='utf-8') as f:
    merged_html = f.read()

# Make sure style_v2.CSS is linked
if 'style_v2.CSS' not in merged_html:
    merged_html = merged_html.replace('<link rel="stylesheet" href="style.CSS">', '<link rel="stylesheet" href="style.CSS">\n  <link rel="stylesheet" href="style_v2.CSS">')

# Strip the partial ov-sync from the bottom of merged_html if it exists
sync_idx = merged_html.find('<!-- Sync -->')
if sync_idx != -1:
    merged_html = merged_html[:sync_idx]

# 2. Reconstruct the bottom part (from ov-sync to the end) using standard English tags
bottom_part = """<!-- Sync -->
<div class="overlay" id="ov-sync">
  <div class="overlay-head">
    <button class="back" onclick="closeOverlay('sync')">
      <i class="fa-solid fa-arrow-right"></i>
    </button>
    <h2><i class="fa-solid fa-arrows-rotate"></i> البيانات والمزامنة</h2>
  </div>
  <div class="overlay-body"><div id="sync-content"></div></div>
</div>

<!-- التحليلات -->
<div class="overlay" id="ov-stats2">
  <div class="overlay-head">
    <button class="back" onclick="closeOverlay('stats2')">
      <i class="fa-solid fa-arrow-right"></i>
    </button>
    <h2><i class="fa-solid fa-chart-line"></i> التحليلات البيانية</h2>
  </div>
  <div class="overlay-body"><div id="analytics-content"></div></div>
</div>

<!-- الإشعارات -->
<div class="overlay" id="ov-notif">
  <div class="overlay-head">
    <button class="back" onclick="closeOverlay('notif')">
      <i class="fa-solid fa-arrow-right"></i>
    </button>
    <h2><i class="fa-solid fa-bell"></i> إعدادات التنبيهات</h2>
  </div>
  <div class="overlay-body"><div id="notif-content"></div></div>
</div>

<!-- Premium Modal -->
<div id="premium" style="display:none;position:fixed;inset:0;z-index:5000;background:rgba(0,0,0,.8);align-items:center;justify-content:center;padding:20px;">
  <div class="card" style="max-width:360px;width:100%;text-align:center;">
    <div style="font-size:2.5rem;margin-bottom:12px;">👑</div>
    <div style="font-weight:900;font-size:1.1rem;margin-bottom:8px;" id="premium-title">هذه الميزة للمشتركين</div>
    <p style="color:var(--text-muted);margin-bottom:20px;">اشترك في ECO-BEM PRO للوصول الكامل</p>
    <button class="btn btn-primary btn-block" onclick="openPayments()">عرض الاشتراكات</button>
    <button class="btn btn-ghost btn-block" onclick="togglePremium(false)" style="margin-top:10px;">لاحقاً</button>
  </div>
</div>

<!-- Toast -->
<div class="toast" id="toast">
  <i class="fa-solid fa-circle-info"></i>
  <span id="toast-text"></span>
</div>
"""

# 3. Read rebuild_full_index.py to extract ov-annals
with open(script_file, 'r', encoding='utf-8') as f:
    script_content = f.read()

start_marker = '<!-- Annals (Past Papers) Overlay -->'
end_marker = '<!-- Sync Overlay -->'

start_idx = script_content.find(start_marker)
end_idx = script_content.find(end_marker)

annals_overlay = ""
if start_idx != -1 and end_idx != -1:
    annals_overlay = script_content[start_idx:end_idx] + "\n"
else:
    print("Could not find Annals Overlay in rebuild script.")

# 4. Construct final HTML
final_html = merged_html + annals_overlay + bottom_part + """
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
</html>
"""

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(final_html)

print("index.html fully rebuilt with correct overlays and Annals floating button!")
