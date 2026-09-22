import os

index_file = r'C:\Users\chatt\Desktop\ECO-BEM\index.html'
merged_file = r'C:\Users\chatt\Desktop\ECO-BEM\merged_index.html'

with open(index_file, 'r', encoding='utf-8') as f:
    index_html = f.read()

# Since index.html is truncated at <button class="back" onclick="closeOverlay('sync')">\n        <i class="fa-solid fa-arrow-right"></i>\n      </button>
# It is better to just cut it at <!-- Sync -->
sync_marker = '<!-- Sync -->'
sync_idx = index_html.find(sync_marker)
if sync_idx != -1:
    index_html = index_html[:sync_idx]

with open(merged_file, 'r', encoding='utf-8') as f:
    merged_html = f.read()

merged_sync_idx = merged_html.find(sync_marker)
if merged_sync_idx != -1:
    rest_of_html = merged_html[merged_sync_idx:]
else:
    # Fallback to hardcoded bottom part if not found
    rest_of_html = """<!-- Sync -->
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

final_html = index_html + rest_of_html

with open(index_file, 'w', encoding='utf-8') as f:
    f.write(final_html)

print("SUCCESS: index.html is fully repaired and complete!")
