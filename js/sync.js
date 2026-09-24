/* ═══ Sync Panel ═══ */
function renderSyncPanel() {
  const box = document.getElementById('sync-content');
  if (!box) return;
  box.innerHTML = `
    <div class="card">
      <div class="section-label">إدارة البيانات</div>
      <p style="color:var(--text-muted);font-size:.88rem;line-height:1.7;margin-bottom:16px">
        بياناتك محفوظة محلياً. يمكنك تصديرها للاحتفاظ بنسخة احتياطية.
      </p>
      <button class="btn btn-mint btn-block" onclick="exportBackup()">
        <i class="fa-solid fa-download"></i> تصدير نسخة احتياطية
      </button>
    </div>
  `;
}
async function exportBackup() {
  try {
    const data = {};
    for (const store of Object.keys(STORES)) data[store] = await dbGetAll(store);
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eco-bem-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('✅ تم التصدير', 'ok');
  } catch(e) { toast('❌ فشل التصدير', 'err'); }
}
