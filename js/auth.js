/* ═══ User Name ═══ */
const USER_NAME_KEY = 'eco-user-name-v9';
function getUserName() {
  try { return localStorage.getItem(USER_NAME_KEY) || 'سيدعلي شطي'; } catch(e) { return 'سيدعلي شطي'; }
}
function setUserName(name) {
  const clean = (name || '').trim().slice(0, 40);
  if (!clean) return false;
  try { localStorage.setItem(USER_NAME_KEY, clean); } catch(e) {}
  renderUserName();
  return true;
}
function renderUserName() {
  const name = getUserName();
  const first = name.charAt(0) || 'س';
  ['drawer-name', 'account-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = name;
  });
  ['drawer-avatar', 'account-avatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = first;
  });
  const navAvatar = document.querySelector('.avatar-mini');
  if (navAvatar) navAvatar.textContent = first;
  const rank = document.getElementById('my-name-row');
  if (rank) rank.textContent = `👤 ${name}`;
}
function editUserName() {
  Sound.tap();
  const cur = getUserName();
  const nxt = prompt('✏️ أدخل اسمك الكامل:', cur);
  if (nxt === null) return;
  if (setUserName(nxt)) { Sound.ok(); toast('✅ تم تحديث الاسم', 'ok'); }
  else toast('⚠️ اسم غير صالح', 'err');
}
function confirmLogout() {
  if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
    localStorage.removeItem('eco_token');
    localStorage.removeItem('eco_user');
    location.reload();
  }
}



/* ══════════════ Avatar & Dream Logic ══════════════ */
window.handleAvatarUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    try {
      localStorage.setItem('eco_user_avatar', dataUrl);
      window.loadAvatar(); console.log('Avatar uploaded and loaded!');
      toast('تم تحديث الصورة بنجاح! 📸', 'ok');
    } catch (err) {
      toast('❌ الصورة كبيرة جداً، يرجى اختيار صورة أصغر بحجم أقل من 2 ميغابايت.', 'err');
    }
  };
  reader.readAsDataURL(file);
};

window.loadAvatar = function() {
  try {
    const dataUrl = localStorage.getItem('eco_user_avatar');
    const avatarEl = document.getElementById('account-avatar');
    const drawerAvatarEl = document.getElementById('drawer-avatar');
    const miniEl = document.querySelector('.avatar-mini');
    const initialEl = document.getElementById('avatar-initial');
    
    if (dataUrl) {
      if (avatarEl) {
        avatarEl.style.backgroundImage = 'url(' + dataUrl + ')';
        if(initialEl) initialEl.style.display = 'none';
      }
      if (drawerAvatarEl) {
        drawerAvatarEl.style.backgroundImage = 'url(' + dataUrl + ')';
        drawerAvatarEl.style.backgroundSize = 'cover';
        drawerAvatarEl.style.backgroundPosition = 'center';
        drawerAvatarEl.style.color = 'transparent'; // hide the initial text
      }
      if (miniEl) {
        miniEl.style.backgroundImage = 'url(' + dataUrl + ')';
        miniEl.style.backgroundSize = 'cover';
        miniEl.style.backgroundPosition = 'center';
        miniEl.style.color = 'transparent'; // hide text
      }
    }
    
    // Apply Active Border
    const activeBorder = localStorage.getItem('eco_active_border');
    if (activeBorder) {
        let borderCss = '';
        if (activeBorder === 'border_bronze') borderCss = '3px solid #cd7f32';
        if (activeBorder === 'border_silver') borderCss = '3px solid #c0c0c0';
        if (activeBorder === 'border_gold') borderCss = '3px solid #fbbf24';
        if (activeBorder === 'border_fire') borderCss = '3px solid #ef4444'; // Simplified for inline styles
        
        if (avatarEl) avatarEl.style.border = borderCss;
        if (drawerAvatarEl) drawerAvatarEl.style.border = borderCss;
        if (miniEl) miniEl.style.border = borderCss;
        
        if (activeBorder === 'border_gold') {
            if (avatarEl) avatarEl.style.boxShadow = '0 0 10px #fbbf24';
            if (drawerAvatarEl) drawerAvatarEl.style.boxShadow = '0 0 10px #fbbf24';
            if (miniEl) miniEl.style.boxShadow = '0 0 10px #fbbf24';
        }
    }
  } catch(e) {}
};

window.editDream = function() {
  let current = '';
  try { current = localStorage.getItem('eco_user_dream') || ''; } catch(e){}
  const nxt = prompt('🎯 ما هو هدفك الأكبر هذا العام؟ (مثال: معدل 18 لثانوية الرياضيات)', current);
  if (nxt !== null) {
    try {
      localStorage.setItem('eco_user_dream', nxt);
      window.loadDream();
      toast('تم حفظ حلمك، نحن نؤمن بك! 🌟', 'ok');
    } catch(e) {}
  }
};

window.loadDream = function() {
  try {
    const d = localStorage.getItem('eco_user_dream');
    const el = document.getElementById('account-dream');
    if (el) {
      if (d && d.trim().length > 0) el.textContent = d;
      else el.textContent = 'اضغط هنا لكتابة حلمك...';
    }
  } catch(e) {}
};

// Hook into initial UI setup
const oldUpdateUserUI = window.updateUserUI;
window.updateUserUI = function() {
  if (typeof oldUpdateUserUI === 'function') oldUpdateUserUI();
  window.loadAvatar(); console.log('Avatar uploaded and loaded!');
  window.loadDream();
};




/* ══════════════ AUTH & DB SYNC LOGIC ══════════════ */
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3000/api' : (window.location.protocol === 'file:') ? 'https://eco-bem.vercel.app/api' : '/api';

window.switchAuth = function(tab) {
  document.getElementById('tab-login').classList.remove('on');
  document.getElementById('tab-register').classList.remove('on');
  document.getElementById('form-login').style.display = 'none';
  document.getElementById('form-register').style.display = 'none';

  document.getElementById('tab-' + tab).classList.add('on');
  document.getElementById('form-' + tab).style.display = 'block';
  Sound.tap();
};

window.handleRegister = async function(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-pass').value;
  
  try {
    const res = await fetch(API_URL + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    localStorage.setItem('eco_token', data.token);
    localStorage.setItem('eco_saved_email', email);
    toast(data.message, 'ok');
    closeOverlay('auth');
    syncUserData(); // Load from DB
  } catch(err) {
    toast(err.message, 'err');
  }
};

window.handleLogin = async function(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-pass').value;
  
  try {
    const res = await fetch(API_URL + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    localStorage.setItem('eco_token', data.token);
    localStorage.setItem('eco_saved_email', email);
    toast(data.message, 'ok');
    closeOverlay('auth');
    syncUserData(); // Load from DB
  } catch(err) {
    toast(err.message, 'err');
  }
};

window.handleLogout = function() {
  if(confirm('هل أنت متأكد من تسجيل الخروج؟')) {
    localStorage.removeItem('eco_token');
    localStorage.removeItem('eco_user');
    location.reload();
  }
};

window.syncUserData = async function() {
  const token = localStorage.getItem('eco_token');
  if (!token) return; // Stay in local guest mode

  try {
    const res = await fetch(API_URL + '/user/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      const user = await res.json();
      // Override local data with DB data
      setUserName(user.name, true);
      if (user.avatar_url) localStorage.setItem('eco_user_avatar', user.avatar_url);
      if (user.dream_goal) localStorage.setItem('eco_user_dream', user.dream_goal);
      if (user.active_border) localStorage.setItem('eco_active_border', user.active_border);
      if (user.inventory) localStorage.setItem('eco_user_inventory', JSON.stringify(user.inventory));
      // Force overwrite local XP, Coins, Streak with DB truth
      if (typeof EcoDB !== 'undefined' && EcoDB.setStat) {
        EcoDB.setStat('xp', user.xp || 0);
        EcoDB.setStat('streak', user.streak || 0);
      }
      
      // Force overwrite eco-mvs.js Smart Teacher XP
      try {
        let ecoStr = localStorage.getItem('eco_engine_state');
        if (ecoStr) {
            let ecoObj = JSON.parse(ecoStr);
            ecoObj.xp = user.xp || 0;
            localStorage.setItem('eco_engine_state', JSON.stringify(ecoObj));
        }
      } catch(e) {}

      document.getElementById('acc-xp').textContent = user.xp || 0;
      
      // Coins Logic
      window.userCoins = user.coins || 0;
      const coinsEl = document.getElementById('ui-coins');
      if (coinsEl) coinsEl.textContent = window.userCoins;

      window.loadAvatar(); console.log('Avatar uploaded and loaded!');
      window.loadDream();
      
      // Initial render for daily quests
      if(typeof renderDailyQuests === 'function') renderDailyQuests();
    } else {
      // Token invalid
      localStorage.removeItem('eco_token');
    }
  } catch(err) {
    console.error("Sync error:", err);
  }
};

window.saveToDB = async function(updates) {
  const token = localStorage.getItem('eco_token');
  if (!token) return; // local only
  try {
    await fetch(API_URL + '/user/update', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token 
      },
      body: JSON.stringify(updates)
    });
  } catch(e) {}
};

// Hook into existing avatar and dream saving logic
const originalHandleAvatarUpload = window.handleAvatarUpload;
window.handleAvatarUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // Compress image
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 256;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      try {
        localStorage.setItem('eco_user_avatar', dataUrl);
        window.loadAvatar(); console.log('Avatar uploaded and loaded!');
        window.saveToDB({ avatar_url: dataUrl }); // SYNC TO DB
        toast('تم تحديث الصورة بنجاح! 📸', 'ok');
      } catch (err) {
        toast('❌ حدث خطأ في حفظ الصورة.', 'err');
      }
      event.target.value = ''; // Reset input so same file can be chosen again
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.editDream = function() {
  let current = '';
  try { current = localStorage.getItem('eco_user_dream') || ''; } catch(e){}
  const nxt = prompt('🎯 ما هو هدفك الأكبر هذا العام؟ (مثال: معدل 18 لثانوية الرياضيات)', current);
  if (nxt !== null) {
    try {
      localStorage.setItem('eco_user_dream', nxt);
      window.loadDream();
      window.saveToDB({ dream_goal: nxt }); // SYNC TO DB
      toast('تم حفظ حلمك، نحن نؤمن بك! 🌟', 'ok');
    } catch(e) {}
  }
};

// Override setUserName to sync if needed
const originalSetUserName = window.setUserName;
window.setUserName = function(name, skipSync = false) {
  const res = originalSetUserName(name);
  if (res && !skipSync) {
    window.saveToDB({ name });
  }
  return res;
}





/* 🪙🪙🪙 DAILY QUESTS & COINS LOGIC 🪙🪙🪙 */
window.userCoins = parseInt(localStorage.getItem('eco_user_coins_v2')) || 0;

window.addPoints = async function(amount, reason) {
    window.userCoins += amount;
    localStorage.setItem('eco_user_coins_v2', window.userCoins);
    if (typeof window.saveToDB === 'function') window.saveToDB({ coins: window.userCoins });
    if (typeof window.updateGlobalUI === 'function') await window.updateGlobalUI();
    
    let stats = [];
    try {
        stats = JSON.parse(localStorage.getItem('eco_bem_stats_v2')) || [];
    } catch(e) {}
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-DZ') + " " + now.toLocaleTimeString('ar-DZ');
    
    stats.unshift({
        date: dateStr,
        amount: amount,
        reason: reason
    });
    if (stats.length > 50) stats = stats.slice(0, 50);
    
    localStorage.setItem('eco_bem_stats_v2', JSON.stringify(stats));
    
    if (typeof toast === 'function') toast(`رائع! كسبت ${amount} نقطة 🪙`, 'ok');
    if (typeof renderAnalytics === 'function') renderAnalytics();
};

window.dailyQuests = [
  { id: 'math-quiz', title: 'حل تمرين رياضيات', xpReward: 50, coinsReward: 10, icon: 'fa-calculator', color: '#38bdf8', isDone: false, action: () => openLessons('math') },
  { id: 'ai-chat', title: 'اطرح سؤالاً على المعلم الذكي', xpReward: 30, coinsReward: 5, icon: 'fa-robot', color: '#8b5cf6', isDone: false, action: () => openOverlay('teacher') },
  { id: 'zen-mode', title: 'جلسة تنفس (مساحة رفيقي)', xpReward: 20, coinsReward: 5, icon: 'fa-leaf', color: '#34d399', isDone: false, action: () => openOverlay('zen') }
];

window.completeQuest = async function(questId) {
  const q = window.dailyQuests.find(x => x.id === questId);
  if (!q || q.isDone) return;
  
  q.isDone = true;
  
  // Award XP
  try { await EcoDB.addXP(q.xpReward); } catch(e) {}
  
  // Award Coins and sync UI
  await window.addPoints(q.coinsReward, 'إنجاز مهمة');
  
  toast(`مهمة منجزة! حصلت على ${q.xpReward} XP و ${q.coinsReward} عملات ذهبية`, 'ok');
  Sound.ok();
  
  renderDailyQuests();
};

window.renderDailyQuests = function() {
  const container = document.getElementById('daily-quests-container');
  const progress = document.getElementById('quests-progress');
  if (!container || !progress) return;
  
  container.innerHTML = '';
  
  let doneCount = 0;
  
  window.dailyQuests.forEach(q => {
    if (q.isDone) doneCount++;
    
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '12px';
    div.style.padding = '12px';
    div.style.background = 'var(--bg-elev-1)';
    div.style.borderRadius = 'var(--r-md)';
    
    if (q.isDone) {
      div.style.opacity = '0.6';
      div.innerHTML = `
        <i class="fa-solid fa-circle-check" style="color:#10b981;font-size:1.2rem"></i>
        <div style="flex:1">
          <div style="font-weight:700;font-size:0.95rem;text-decoration:line-through">${q.title}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">+${q.xpReward} XP | +${q.coinsReward} 🪙</div>
        </div>
      `;
    } else {
      div.style.borderRight = `3px solid ${q.color}`;
      div.innerHTML = `
        <i class="fa-solid ${q.icon}" style="color:${q.color};font-size:1.2rem"></i>
        <div style="flex:1">
          <div style="font-weight:700;font-size:0.95rem">${q.title}</div>
          <div style="font-size:0.75rem;color:${q.color}">+${q.xpReward} XP | +${q.coinsReward} 🪙</div>
        </div>
        <button class="btn btn-primary" style="padding:4px 12px;font-size:0.8rem;border-radius:12px;background:${q.color};border:none">إنجاز</button>
      `;
      const btn = div.querySelector('button');
      btn.onclick = () => {
         // Perform action first
         if(q.action) q.action();
         // Wait a little before marking it complete (in real life, this would hook into the actual completion event of the lesson/chat)
         setTimeout(() => window.completeQuest(q.id), 2000);
      };
    }
    
    container.appendChild(div);
  });
  
  progress.textContent = `${doneCount}/${window.dailyQuests.length} منجزة`;
};

// Initial Render
document.addEventListener('DOMContentLoaded', () => {
  renderDailyQuests();
});


/* 🏆 LEADERBOARD LOGIC 🏆 */
window.loadLeaderboard = async function() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin"></i> جاري تحميل القائمة...</div>';
    
    let data = [];
    try {
        const res = await fetch(API_URL + '/leaderboard');
        if (!res.ok) throw new Error('Failed to fetch');
        data = await res.json();
    } catch (err) {
        // Smart Simulation Leaderboard Logic
        const mockNames = ['أحمد ب.', 'سارة ع.', 'محمد ق.', 'إيناس م.', 'عبدالرؤوف', 'ملاك', 'ريان', 'ياسين', 'فاطمة', 'أمينة', 'وليد'];
        
        let simUsers = JSON.parse(localStorage.getItem('eco_sim_leaderboard'));
        const myXp = window.userXP || 0;
        
        if (!simUsers) {
            // First time setup: Generate users around the player's XP
            simUsers = [];
            let startXP = myXp + 500; // Someone slightly ahead
            for(let i=0; i<10; i++) {
                simUsers.push({
                    id: 'sim_' + i,
                    name: mockNames[i % mockNames.length],
                    xp: Math.max(0, startXP - (Math.floor(Math.random() * 200))),
                    avatar_url: ''
                });
                startXP -= Math.floor(Math.random() * 150) + 50;
            }
            localStorage.setItem('eco_sim_leaderboard', JSON.stringify(simUsers));
        } else {
            // Simulate progression: random users gain XP over time
            let lastUpdate = localStorage.getItem('eco_sim_last_update') || Date.now();
            let hoursPassed = (Date.now() - parseInt(lastUpdate)) / (1000 * 60 * 60);
            
            if (hoursPassed > 1) { // Only simulate if an hour has passed, or just add random XP on load
                simUsers.forEach(u => {
                    // Virtual users gain between 10 and 150 XP randomly
                    if (Math.random() > 0.3) {
                        u.xp += Math.floor(Math.random() * 140) + 10;
                    }
                });
                localStorage.setItem('eco_sim_leaderboard', JSON.stringify(simUsers));
                localStorage.setItem('eco_sim_last_update', Date.now());
            }
        }
        
        data = [...simUsers];
        
        // Add current user
        const myName = document.getElementById('account-name')?.textContent || 'أنا';
        const myAvatar = localStorage.getItem('eco_user_avatar') || '';
        data.push({ name: myName + ' (أنت)', xp: myXp, avatar_url: myAvatar, isMe: true });
        
        // Sort
        data.sort((a, b) => b.xp - a.xp);
    }
    
    list.innerHTML = '';
    
    data.forEach((user, index) => {
            let rowClass = 'rank-row';
            if (index === 0) rowClass += ' gold';
            else if (index === 1) rowClass += ' silver';
            else if (index === 2) rowClass += ' bronze';
            // Check if this is the current user
            const myName = document.getElementById('account-name')?.textContent;
            if (user.isMe || (myName && user.name === myName)) {
                rowClass += ' me';
                myRank = index + 1;
            }
            
            const div = document.createElement('div');
            div.className = rowClass;
            
            // Store borders
            let borderCss = '';
            if (user.active_border === 'border_bronze') borderCss = 'border: 3px solid #cd7f32;';
            if (user.active_border === 'border_silver') borderCss = 'border: 3px solid #c0c0c0;';
            if (user.active_border === 'border_gold') borderCss = 'border: 3px solid #fbbf24; box-shadow: 0 0 10px #fbbf24;';
            if (user.active_border === 'border_fire') borderCss = 'border: 3px solid transparent; background: linear-gradient(var(--surface-light), var(--surface-light)) padding-box, linear-gradient(to right, #ef4444, #f97316) border-box;';

            // Generate avatar if not present
            let avatarHtml = `<span class="rank-num">${index + 1}</span>`;
            if (user.avatar_url && user.avatar_url.trim() !== '') {
                avatarHtml = `<div style="display:flex;align-items:center;gap:10px;">
                                <span class="rank-num">${index + 1}</span>
                                <div style="width:30px;height:30px;border-radius:50%;background:url('${user.avatar_url}') center/cover;${borderCss || 'border:1px solid rgba(255,255,255,0.2);'}"></div>
                              </div>`;
            }
            
            div.innerHTML = `
                ${avatarHtml}
                <span class="rank-name">${user.name}</span>
                <span class="rank-xp">${user.xp || 0} XP</span>
            `;
            list.appendChild(div);
        });
};
