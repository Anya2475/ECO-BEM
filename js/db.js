/* ═══ IndexedDB ═══ */
const DB_NAME = 'eco-bem-db-v9';
const DB_VERSION = 1;
const STORES = {
  attempts: { keyPath: 'id', autoIncrement: true, indexes: [['subject','subject']] },
  sessions: { keyPath: 'id', autoIncrement: true, indexes: [['type','type']] },
  stats: { keyPath: 'key' },
  achievements: { keyPath: 'id', autoIncrement: true },
  moods: { keyPath: 'id', autoIncrement: true },
  ai_messages: { keyPath: 'id', autoIncrement: true }
};
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      Object.entries(STORES).forEach(([name, cfg]) => {
        if (!d.objectStoreNames.contains(name)) {
          const s = d.createObjectStore(name, { keyPath: cfg.keyPath, autoIncrement: cfg.autoIncrement });
          cfg.indexes?.forEach(([idxName, keyPath]) => s.createIndex(idxName, keyPath, { unique: false }));
        }
      });
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}
async function dbAdd(store, data) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, 'readwrite');
    const req = tx.objectStore(store).add(data);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function dbPut(store, data) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(data);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function dbGet(store, key) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function dbGetAll(store) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function dbClear(store) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, 'readwrite');
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}
async function dbCount(store) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, 'readonly');
    const req = tx.objectStore(store).count();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

const EcoDB = {
  async saveAttempt({ subject, year, score, total, type = 'quiz', meta = {} }) {
    const a = { subject, year, score, total, percent: Math.round((score/total)*100), type, meta, date: new Date().toISOString() };
    const id = await dbAdd('attempts', a);
    try { await this.updateStreak(); await this.checkAchievements(); } catch(e) {}
    return { ...a, id };
  },
  async logSession(type, duration, meta = {}) {
    return dbAdd('sessions', { type, duration, meta, date: new Date().toISOString() });
  },
  async getTotalStudyTime() {
    const s = await dbGetAll('sessions');
    return s.filter(x => x.type === 'pomodoro' || x.type === 'lesson').reduce((sum, x) => sum + (x.duration || 0), 0);
  },
  async getStat(key) { const r = await dbGet('stats', key); return r ? r.value : null; },
  async setStat(key, value) { 
    const res = await dbPut('stats', { key, value, updatedAt: new Date().toISOString() }); 
    if (typeof window.saveToDB === 'function') {
      if (key === 'xp') window.saveToDB({ xp: value });
      if (key === 'streak') window.saveToDB({ streak: value });
      if (key === 'coins') window.saveToDB({ coins: value });
    }
    return res;
  },
  async addXP(amount) {
    if (amount > 0) {
      try { await this.updateStreak(); } catch(e) {}
    }
    const cur = (await this.getStat('xp')) || 0;
    const nxt = cur + amount;
    await this.setStat('xp', nxt);
    const lvl = Math.floor(nxt/100) + 1;
    const oldLvl = Math.floor(cur/100) + 1;
    
    if (typeof window.updateGlobalUI === 'function') await window.updateGlobalUI();
    
    if (lvl > oldLvl) {
      await this.unlockAchievement(`level-${lvl}`, `وصلت للمستوى ${lvl}`, '🎖️');
      return { level: lvl, leveledUp: true, xp: nxt };
    }
    return { level: lvl, leveledUp: false, xp: nxt };
  },
  async updateStreak() {
    const today = new Date().toDateString();
    const last = await this.getStat('lastActiveDate');
    const cur = (await this.getStat('streak')) || 0;
    const best = (await this.getStat('bestStreak')) || 0;
    if (last === today) return cur;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const consec = last === y.toDateString();
    const nxt = consec ? cur + 1 : 1;
    await this.setStat('streak', nxt);
    await this.setStat('lastActiveDate', today);
    if (nxt > best) await this.setStat('bestStreak', nxt);
    
    if (typeof window.updateGlobalUI === 'function') await window.updateGlobalUI();
    
    return nxt;
  },
  async getStreak() {
    return { current: (await this.getStat('streak')) || 0, best: (await this.getStat('bestStreak')) || 0 };
  },
  async unlockAchievement(id, title, icon) {
    const ex = await dbGetAll('achievements');
    if (ex.some(a => a.id === id)) return null;
    const ach = { id, title, icon, unlockedAt: new Date().toISOString() };
    await dbAdd('achievements', ach);
    setTimeout(() => toast(`${icon} إنجاز: ${title}`, 'ok'), 400);
    return ach;
  },
  async getAchievements() { return dbGetAll('achievements'); },
  async checkAchievements() {
    const attempts = await dbGetAll('attempts');
    const perfect = attempts.filter(a => a.percent === 100).length;
    if (attempts.length === 1) await this.unlockAchievement('first-quiz', 'أول اختبار!', '🎯');
    if (attempts.length === 10) await this.unlockAchievement('ten-quizzes', '10 اختبارات!', '🔟');
    if (perfect === 1) await this.unlockAchievement('first-perfect', 'علامة كاملة!', '💯');
  },
  async logMood(mood, note = '') {
    return dbAdd('moods', { mood, note, date: new Date().toISOString() });
  },
  async getDashboard() {
    const [xp, streak, totalAttempts, totalStudyTime, achievements] = await Promise.all([
      this.getStat('xp'), this.getStreak(), dbCount('attempts'),
      this.getTotalStudyTime(), this.getAchievements()
    ]);
    const level = Math.floor((xp || 0) / 100) + 1;
    const nextLevelXP = level * 100;
    const prevLevelXP = (level - 1) * 100;
    const levelProgress = Math.round(((xp || 0) - prevLevelXP) / (nextLevelXP - prevLevelXP) * 100);
    return {
      xp: xp || 0, level, levelProgress, nextLevelXP, streak,
      totalAttempts, totalStudyTime,
      totalStudyHours: Math.round(totalStudyTime / 3600 * 10) / 10,
      achievements: achievements.length,
      recentAchievements: achievements.slice(-3).reverse()
    };
  }
};

window.initHearts = function() {
    let hearts = localStorage.getItem('eco_user_hearts');
    let lastRefill = localStorage.getItem('eco_hearts_last_refill');
    let isPremium = localStorage.getItem('eco_user_premium') === 'true';
    
    if (isPremium) {
        window.userHearts = '∞';
        return;
    }
    
    if (!hearts) {
        hearts = 5;
        localStorage.setItem('eco_user_hearts', hearts);
        localStorage.setItem('eco_hearts_last_refill', Date.now());
    } else {
        hearts = parseInt(hearts);
        if (hearts < 5 && lastRefill) {
            let now = Date.now();
            let hoursPassed = (now - parseInt(lastRefill)) / (1000 * 60 * 60);
            let heartsToAdd = Math.floor(hoursPassed / 4); // 1 heart every 4 hours
            if (heartsToAdd > 0) {
                hearts = Math.min(5, hearts + heartsToAdd);
                localStorage.setItem('eco_user_hearts', hearts);
                localStorage.setItem('eco_hearts_last_refill', now);
                if (typeof window.saveToDB === 'function') window.saveToDB({ hearts: hearts });
            }
        }
    }
    window.userHearts = hearts;
};

window.useHeart = function() {
    if (window.userHearts === '∞') return true;
    if (window.userHearts > 0) {
        window.userHearts--;
        localStorage.setItem('eco_user_hearts', window.userHearts);
        if (typeof window.saveToDB === 'function') window.saveToDB({ hearts: window.userHearts });
        if (window.userHearts === 4) {
            localStorage.setItem('eco_hearts_last_refill', Date.now());
        }
        window.updateGlobalUI();
        return true;
    }
    return false;
};

window.refillHearts = function(amount = 5) {
    if (window.userHearts === '∞') return;
    window.userHearts = Math.min(5, window.userHearts + amount);
    localStorage.setItem('eco_user_hearts', window.userHearts);
    if (typeof window.saveToDB === 'function') window.saveToDB({ hearts: window.userHearts });
    if (window.userHearts === 5) {
        localStorage.removeItem('eco_hearts_last_refill');
    }
    window.updateGlobalUI();
};

window.initHearts();

window.updateGlobalUI = async function() {
  const xp = (await EcoDB.getStat('xp')) || 0;
  const streakData = await EcoDB.getStreak();
  const streak = streakData.current || 0;
  const coins = parseInt(localStorage.getItem('eco_user_coins_v2')) || 0;
  
  window.userXP = xp;
  window.userCoins = coins;
  window.initHearts();

  const uiCoins = document.getElementById('ui-coins');
  if (uiCoins) uiCoins.textContent = coins;
  
  const uiHearts = document.getElementById('ui-hearts');
  if (uiHearts) uiHearts.innerHTML = window.userHearts === '∞' ? '<i class="fa-solid fa-infinity" style="font-size:1.1rem; margin-top:3px;"></i>' : window.userHearts;

  const uiStreak = document.getElementById('ui-streak');
  if (uiStreak) uiStreak.textContent = streak;
  
  const accXp = document.getElementById('acc-xp');
  if (accXp) accXp.textContent = xp;
  
  const myXp = document.getElementById('my-xp');
  if (myXp) myXp.textContent = xp + ' XP';
  
  // Sync XP to Global Leaderboard (if online)
  try {
      const myName = typeof getUserName === 'function' ? getUserName() : (document.getElementById('account-name')?.textContent || 'بطل BEM');
      const myAvatar = localStorage.getItem('eco_user_avatar') || '';
      const myBorder = localStorage.getItem('eco_active_border') || '';
      
      const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3000/api' : (window.location.protocol === 'file:') ? 'https://eco-bem.vercel.app/api' : '/api';
      
      fetch(API_URL + '/leaderboard/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: myName, xp: xp, avatar_url: myAvatar, active_border: myBorder })
      }).catch(e => {}); // Silent fail if offline
  } catch(e) {}
  
  // Update UI sections if they are active
  if (document.getElementById('ov-stats2')?.classList.contains('on')) {
      if(typeof renderAnalytics === 'function') renderAnalytics();
  }
  if (document.getElementById('tab-stats')?.classList.contains('on')) {
      if(typeof renderDashboard === 'function') renderDashboard();
  }
};

window.resetAllStats = async function() {
  if(!confirm("هل أنت متأكد من تصفير جميع النقاط والعملات والتقدم؟")) return;
  await EcoDB.setStat('xp', 0);
  await EcoDB.setStat('streak', 0);
  await EcoDB.setStat('bestStreak', 0);
  await EcoDB.setStat('lastActiveDate', '');
  
  localStorage.setItem('eco_user_coins_v2', '0');
  localStorage.setItem('eco_bem_stats_v2', '[]');
  
  try {
    const d = await openDB();
    const stores = ['achievements', 'attempts', 'sessions', 'moods'];
    const tx = d.transaction(stores, 'readwrite');
    stores.forEach(s => tx.objectStore(s).clear());
    await new Promise(r => { tx.oncomplete = r; tx.onerror = r; });
  } catch (e) {
    console.error('Clear DB Error:', e);
  }
  
  await window.updateGlobalUI();
  toast("تم تصفير جميع النقاط والتقدم بنجاح", "ok");
};
