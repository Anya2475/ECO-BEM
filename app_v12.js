/* ═══════════════════════════════════════════════════════
   ECO-BEM v9.0 — Royal Noir + Lime
   JavaScript Application
   ═══════════════════════════════════════════════════════ */

'use strict';

/* ═══ Sound Engine ═══ */
const Sound = {
  ctx: null,
  init() {
    if (!this.ctx) try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur = 0.08, type = 'sine', vol = 0.05, delay = 0) {
    try {
      this.init(); if (!this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch(e) {}
  },
  tap() { this.tone(520, 0.05, 'sine', 0.03); },
  ok() { [523,659,784].forEach((f,i) => this.tone(f, 0.25, 'sine', 0.06, i*0.08)); },
  err() { this.tone(180, 0.22, 'triangle', 0.06); }
};

/* ═══ Toast ═══ */
let toastT;
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  document.getElementById('toast-text').textContent = msg;
  el.className = 'toast on' + (type === 'ok' ? ' ok' : type === 'err' ? ' err' : '');
  const icon = el.querySelector('i');
  if (icon) icon.className = 'fa-solid ' + (type === 'ok' ? 'fa-circle-check' : type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-info');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 2800);
  if (typeof playSound === 'function') playSound(type);
}

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
  async setStat(key, value) { return dbPut('stats', { key, value, updatedAt: new Date().toISOString() }); },
  async addXP(amount) {
    const cur = (await this.getStat('xp')) || 0;
    const nxt = cur + amount;
    await this.setStat('xp', nxt);
    const lvl = Math.floor(nxt/100) + 1;
    const oldLvl = Math.floor(cur/100) + 1;
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

/* ═══ Math Rendering ═══ */
function renderMathIn(el, attempt = 0) {
  if (!el) return;
  if (!window.renderMathInElement) {
    if (attempt < 5) setTimeout(() => renderMathIn(el, attempt + 1), 400);
    return;
  }
  try {
    window.renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  } catch(e) { console.warn('[KaTeX]', e); }
}

/* ═══════════════════════════════════════════════════════
   LESSON DATA — المقطع الأول الرسمي 2025/2026
   ═══════════════════════════════════════════════════════ */
const learningDB = {
  ar: [
    {
      title: 'فهم المنطوق: ذكرى وندم',
      subtitle: 'المقطع الأول: قضايا اجتماعية',
      diag: { q: 'ما الهدف الأساسي من الاستماع إلى نصّ منطوق؟', opts: [{ t: 'فهم المعنى العام والأفكار الرئيسية', c: true, ex: 'ممتاز! هذا هو جوهر فهم المنطوق.' }, { t: 'حفظ كل كلمة حرفياً', c: false, ex: 'ليس الحفظ المطلوب، بل الفهم.' }] },
      concept: '<h3>مفهوم فهم المنطوق</h3><p>فهم المنطوق هو قدرة المتعلم على الاستماع إلى نصّ شفهي، واستخراج أفكاره الرئيسية، وتحليل مضمونه.</p><ul><li>1. الاستماع الشامل</li><li>2. تحديد الفكرة العامة</li><li>3. استخراج الأفكار الأساسية</li></ul>',
      examples: '<h3>الفكرة العامة والأفكار الأساسية</h3><p><strong>الفكرة العامة:</strong> نصّ سردي يستعرض ذكرى مؤثرة في حياة شخص، ويتناول موضوع الندم.</p><p><strong>القيم المستفادة:</strong> الوفاء بالعهد والوعد، صلة الرحم.</p>',
      progression: '<h3>التدرّج في تحليل النصّ</h3><p>المرحلة 1: الاستماع الشامل. المرحلة 2: تحديد الشخصيات. المرحلة 3: ترتيب الأحداث. المرحلة 4: استخراج القيم.</p>',
      exercises: [{ q: 'ما النمط الغالب على نصّ "ذكرى وندم"؟', opts: [{ t: 'النمط السردي', c: true, ex: 'صحيح!' }, { t: 'النمط الحجاجي', c: false, ex: 'النص سردي.' }] }],
      solutions: '<h3>حلول التمارين</h3><p><strong>التمرين 1:</strong> النمط السردي — لأن النص يعتمد على الأفعال الماضية.</p>',
      quiz: { q: 'هل فهمت النصّ؟', opts: [{ t: 'نعم', c: true }, { t: 'لا', c: false }] }
    },
    {
      title: 'قواعد اللغة: عطف النسق',
      subtitle: 'المقطع الأول: قضايا اجتماعية',
      diag: { q: 'ما الفرق بين الفاء وثم؟', opts: [{ t: 'الفاء للتعقيب، وثم للتراخي', c: true, ex: 'صحيح!' }, { t: 'لا فرق', c: false, ex: 'يوجد فرق زمني.' }] },
      concept: '<h3>مفهوم عطف النسق</h3><p>هو تابع يتوسط بينه وبين متبوعه أحد حروف العطف.</p><p><strong>حروف العطف:</strong> الواو (الجمع)، الفاء (التعقيب)، ثم (التراخي)، أو (التخيير)، أم (التعيين)، بل (الإضراب).</p>',
      examples: '<h3>أمثلة</h3><p>1. «دخل المعلمُ فالتلميذُ» (تعقيب بلا مهلة).</p><p>2. «حضر الأميرُ ثم الوزيرُ» (تراخي بمهلة).</p><p>3. «ما نجح سعيدٌ بل خالدٌ» (إضراب).</p>',
      progression: '<h3>تنبيه هام</h3><p>المعطوف يتبع المعطوف عليه في الإعراب دائماً (رفعاً ونصباً وجراً).</p>',
      exercises: [{ q: 'أعرب خالد في: حضر المدير وخالدٌ', opts: [{ t: 'معطوف مرفوع', c: true, ex: 'صحيح' }, { t: 'مبتدأ', c: false, ex: 'خطأ' }] }],
      solutions: '<h3>الحلول</h3><p>خالد: اسم معطوف مرفوع وعلامة رفعه الضمة.</p>',
      quiz: { q: 'هل فهمت الدرس؟', opts: [{ t: 'نعم', c: true }, { t: 'لا', c: false }] }
    },
    {
      title: 'قواعد اللغة: عطف البيان والبدل',
      subtitle: 'المقطع الأول: قضايا اجتماعية',
      diag: { q: 'ما هو البدل في جملة "جاء الفاروق عمر"؟', opts: [{ t: 'عمر', c: true, ex: 'ممتاز!' }, { t: 'الفاروق', c: false, ex: 'الفاروق مبدل منه' }] },
      concept: '<h3>مفهوم البدل وعطف البيان</h3><p><strong>البدل:</strong> تابع مقصود بالحكم بلا واسطة. أنواعه: بدل مطابق (كل من كل)، بدل جزء من كل، بدل اشتمال.</p><p><strong>عطف البيان:</strong> تابع جامد يوضح متبوعه.</p>',
      examples: '<h3>أمثلة</h3><p>1. بدل مطابق: «نجح هذا التلميذُ».</p><p>2. بدل جزء من كل: «أكلت الرغيفَ نصفَه».</p><p>3. بدل اشتمال: «أعجبني التلميذُ خلقُه».</p>',
      progression: '<h3>فائدة إعرابية</h3><p>كل اسم معرف بـ (ال) بعد اسم إشارة يُعرب بدلاً مطابقاً أو عطف بيان.</p>',
      exercises: [{ q: 'أعرب التلميذ في "نجح هذا التلميذ"', opts: [{ t: 'بدل مرفوع', c: true, ex: 'صحيح' }, { t: 'فاعل', c: false, ex: 'هذا هو الفاعل' }] }],
      solutions: '<h3>الحلول</h3><p>التلميذ: بدل مطابق أو عطف بيان مرفوع وعلامة رفعه الضمة.</p>',
      quiz: { q: 'هل فهمت البدل؟', opts: [{ t: 'نعم', c: true }, { t: 'لا', c: false }] }
    },
    {
      title: 'قواعد اللغة: العدد والمعدود',
      subtitle: 'المقطع الأول: قضايا اجتماعية',
      diag: { q: 'هل نكتب "ثلاثة رجال" أم "ثلاث رجال"؟', opts: [{ t: 'ثلاثة رجال', c: true, ex: 'ممتاز! يخالف.' }, { t: 'ثلاث رجال', c: false, ex: 'خطأ، لأن العدد من 3 لـ 9 يخالف.' }] },
      concept: '<h3>قواعد العدد والمعدود</h3><p>1 و 2 يطابقان. من 3 إلى 9 تخالف. الـ 10 يخالف مفرداً ويطابق مركباً. العقود (20، 30) لا تتغير.</p>',
      examples: '<h3>أمثلة</h3><p>«اشتريت ثلاثةَ أقلامٍ وخمسَ كراساتٍ بـ عشرين ديناراً».</p>',
      progression: '<h3>تنبيه</h3><p>لمعرفة التذكير والتأنيث في المعدود الجمع، نعود لمفرده (كراسات -> كراس: مذكر، إذن نكتب خمس بالتاء أم بدون تاء؟ خمس بدون تاء).</p>',
      exercises: [{ q: 'اكتب الرقم بالحروف: 5 قصص', opts: [{ t: 'خمسُ قصصٍ', c: true, ex: 'صحيح' }, { t: 'خمسةُ قصصٍ', c: false, ex: 'قصة مؤنث إذن خمس مذكر' }] }],
      solutions: '<h3>الحلول</h3><p>خمسُ قصصٍ، لأن قصة مؤنث فالرقم يجب أن يكون مذكراً يخالف.</p>',
      quiz: { q: 'واضحة؟', opts: [{ t: 'نعم', c: true }, { t: 'لا', c: false }] }
    },
    {
      title: 'البلاغة: الاستعارة',
      subtitle: 'المقطع الأول: قضايا اجتماعية',
      diag: { q: 'زأر الجندي في المعركة.. ما نوع الصورة؟', opts: [{ t: 'استعارة مكنية', c: true, ex: 'صحيح' }, { t: 'تشبيه', c: false, ex: 'لا توجد أداة' }] },
      concept: '<h3>مفهوم الاستعارة</h3><p><strong>الاستعارة:</strong> تشبيه بليغ حذف أحد طرفيه.</p><p><strong>المكنية:</strong> حذف المشبه به وبقيت صفة منه.</p><p><strong>التصريحية:</strong> صرح بالمشبه به وحذف المشبه.</p>',
      examples: '<h3>أمثلة</h3><p>1. مكنية: ضحك الصبحُ (شبه الصبح بإنسان).</p><p>2. تصريحية: رأيت أسداً يحمل السلاح (شبه الجندي بالأسد وصرح بالأسد).</p>',
      progression: '<h3>تنبيه</h3><p>أثرها البلاغي: تجسيد المعنى وتقويته وإعطاؤه جمالية.</p>',
      exercises: [{ q: 'افترسنا العدو في المعركة', opts: [{ t: 'مكنية', c: true, ex: 'صحيح' }, { t: 'تصريحية', c: false, ex: 'خطأ' }] }],
      solutions: '<h3>الحلول</h3><p>استعارة مكنية، شبهنا أنفسنا بالأسود التي تفترس.</p>',
      quiz: { q: 'مفهومة؟', opts: [{ t: 'نعم', c: true }, { t: 'لا', c: false }] }
    }
  ],
  math: [
    {
      title: 'قواسم عدد طبيعي والـ PGCD',
      subtitle: 'المقطع الأول: الأعداد الطبيعية',
      diag: { q: 'ما هو أكبر قاسم مشترك بين 12 و 18؟', opts: [{ t: '6', c: true, ex: 'ممتاز!' }, { t: '3', c: false, ex: 'يوجد قاسم أكبر' }] },
      concept: '<h3>الـ PGCD</h3><p>هو أكبر قاسم لعددين. نستخدم خوارزمية إقليدس (القسمات المتتالية) لإيجاده بسرعة. الباقي غير المعدوم الأخير هو الـ PGCD.</p>',
      examples: '<h3>مثال</h3><p>PGCD(156, 132)</p><p>156 = 132 × 1 + 24</p><p>132 = 24 × 5 + 12</p><p>24 = 12 × 2 + 0</p><p>إذن PGCD هو 12.</p>',
      progression: '<h3>تنبيه</h3><p>دائماً استعمل القسمة بدل الطرح لأنها أسرع.</p>',
      exercises: [{ q: 'احسب PGCD(14, 21)', opts: [{ t: '7', c: true, ex: 'صحيح!' }, { t: '1', c: false, ex: 'خطأ' }] }],
      solutions: '<h3>الحلول</h3><p>7 هو القاسم الأكبر.</p>',
      quiz: { q: 'هل فهمت؟', opts: [{ t: 'نعم', c: true }, { t: 'لا', c: false }] }
    },
    {
      title: 'العددان الأوليان والكسور المختزلة',
      subtitle: 'المقطع الأول: الأعداد الطبيعية',
      diag: { q: 'متى نقول أن عددين أوليان فيما بينهما؟', opts: [{ t: 'إذا كان PGCD = 1', c: true, ex: 'ممتاز!' }, { t: 'إذا كانا فرديين', c: false, ex: 'خطأ' }] },
      concept: '<h3>الكسر غير القابل للاختزال</h3><p>لاختزال أي كسر دفعة واحدة، نحسب PGCD البسط والمقام ثم نقسمهما عليه.</p>',
      examples: '<h3>مثال</h3><p>اختزل 132 / 156. وجدنا الـ PGCD = 12. إذن نقسمهما على 12 فنجد 11 / 13.</p>',
      progression: '<h3>تنبيه</h3><p>العددان الأوليان فيما بينهما قاسمهما المشترك الأكبر هو 1.</p>',
      exercises: [{ q: 'هل 14 و 15 أوليان فيما بينهما؟', opts: [{ t: 'نعم', c: true, ex: 'صحيح' }, { t: 'لا', c: false, ex: 'خطأ' }] }],
      solutions: '<h3>الحلول</h3><p>نعم، لأنه لا يوجد قاسم مشترك بينهما سوى 1.</p>',
      quiz: { q: 'فهمت؟', opts: [{ t: 'نعم', c: true }, { t: 'لا', c: false }] }
    },
    {
      title: 'الجذور التربيعية',
      subtitle: 'المقطع الأول: الحساب على الجذور',
      diag: { q: 'كم يساوي جذر 64؟', opts: [{ t: '8', c: true, ex: 'ممتاز' }, { t: '32', c: false, ex: 'هذا النصف وليس الجذر' }] },
      concept: '<h3>مفهوم الجذر</h3><p>الجذر التربيعي لعدد موجب a هو العدد الذي مربعه a. ولا يوجد جذر لعدد سالب.</p><p>المعادلة x² = a : إذا a>0 هناك حلان متعاكسان، إذا a=0 حل وحيد صفر، إذا a<0 لا يوجد حل.</p>',
      examples: '<h3>مثال</h3><p>x² = 16. حلولها: x = 4 و x = -4.</p>',
      progression: '<h3>انتبه</h3><p>جذر 16 هو 4 فقط، ولكن المعادلة المربعة لها حلان!</p>',
      exercises: [{ q: 'حل x² = -5', opts: [{ t: 'لا يوجد حل', c: true, ex: 'ممتاز' }, { t: '5 و -5', c: false, ex: 'خطأ' }] }],
      solutions: '<h3>الحلول</h3><p>لا يوجد حل حقيقي لأن العدد سالب.</p>',
      quiz: { q: 'فهمت؟', opts: [{ t: 'نعم', c: true }, { t: 'لا', c: false }] }
    },
    {
      title: 'العمليات على الجذور وتبسيطها',
      subtitle: 'المقطع الأول: الحساب على الجذور',
      diag: { q: 'هل جذر(9+16) يساوي جذر9 + جذر16 ؟', opts: [{ t: 'لا', c: true, ex: 'ممتاز! لا يوزع على الجمع.' }, { t: 'نعم', c: false, ex: 'احذر من هذا الفخ!' }] },
      concept: '<h3>العمليات</h3><p>الضرب والقسمة مسموح توزيعهما، أما الجمع والطرح فلا!</p><p><strong>التبسيط:</strong> للتبسيط نبحث عن أكبر مربع يقسم العدد. المربعات: 4، 9، 16، 25...</p>',
      examples: '<h3>مثال</h3><p>بسط: جذر 50. جذر 50 = جذر (25 × 2) = 5 جذر 2.</p>',
      progression: '<h3>تنبيه</h3><p>لجمع الجذور يجب أن تكون متشابهة: 2 جذر3 + 4 جذر3 = 6 جذر3.</p>',
      exercises: [{ q: 'بسط جذر 12', opts: [{ t: '2 جذر 3', c: true, ex: 'ممتاز' }, { t: '3 جذر 2', c: false, ex: 'خطأ' }] }],
      solutions: '<h3>الحلول</h3><p>جذر 12 = جذر(4 × 3) = 2 جذر 3.</p>',
      quiz: { q: 'فهمت؟', opts: [{ t: 'نعم', c: true }, { t: 'لا', c: false }] }
    },
    {
      title: 'تنطيق مقام نسبة',
      subtitle: 'المقطع الأول: الحساب على الجذور',
      diag: { q: 'كيف ننطق الكسر الذي مقامه جذر 3؟', opts: [{ t: 'نضرب بسطه ومقامه في جذر 3', c: true, ex: 'ممتاز!' }, { t: 'نحذف الجذر مباشرة', c: false, ex: 'خطأ' }] },
      concept: '<h3>مفهوم التنطيق</h3><p>هو التخلص من الجذر في المقام بجعله عدداً ناطقاً. نضرب البسط والمقام في نفس الجذر الموجود في المقام.</p>',
      examples: '<h3>مثال</h3><p>5 / جذر 2. نضرب البسط والمقام في جذر 2 فيصبح: 5 جذر 2 / 2.</p>',
      progression: '<h3>تنبيه</h3><p>إذا كان في البسط زائد أو ناقص (مثلاً 2+جذر3) يجب استعمال الأقواس عند الضرب!</p>',
      exercises: [{ q: 'ما هو ناتج تنطيق 1 / جذر 5', opts: [{ t: 'جذر 5 / 5', c: true, ex: 'صحيح' }, { t: '1 / 5', c: false, ex: 'خطأ' }] }],
      solutions: '<h3>الحلول</h3><p>نضرب في جذر 5 فتصبح جذر 5 في البسط و 5 في المقام.</p>',
      quiz: { q: 'هل تتقنها؟', opts: [{ t: 'نعم', c: true }, { t: 'لا', c: false }] }
    }
  ]
};;

const AITeacher = {
  history: [
    { role: "system", content: "أنت معلم ذكي ومرح مخصص لمساعدة طلاب شهادة التعليم المتوسط (BEM) في الجزائر. اسمك 'المعلم الذكي'." }
  ],
  renderMarkdown(text) {
    let html = String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
    // Code blocks
    html = html.replace(/```([\s\S]+?)```/g, '<pre style="background:var(--surface);padding:10px;border-radius:8px;overflow-x:auto;text-align:left;direction:ltr"><code>$1</code></pre>');
    html = html.replace(/`(.+?)`/g, '<code style="background:var(--surface);padding:2px 6px;border-radius:4px;color:#10b981">$1</code>');
    
    // Headers
    html = html.replace(/^### (.*?)$/gm, '<h3 style="color:#10b981;margin-top:15px;margin-bottom:5px">$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2 style="color:#10b981;margin-top:15px;margin-bottom:5px">$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1 style="color:#10b981;margin-top:15px;margin-bottom:5px">$1</h1>');
    
    // Bold, Italic, Horizontal Rule
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(16,185,129,0.3);margin:15px 0">');
    
    // Links
    html = html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:#10b981;text-decoration:underline">$1</a>');
    
    // Lists
    html = html.replace(/^[\*\-] (.*?)$/gm, '<li style="margin-right:20px;list-style-type:disc">$1</li>');
    
    // Newlines to <br>
    html = html.replace(/\n/g, '<br>');
    
    return html;
  },
  async send(text) {
    if (!text?.trim()) return;
    const list = document.getElementById('chat');
    if (!list) return;

    // Add user message to UI
    const me = document.createElement('div');
    me.className = 'bubble me'; me.textContent = text;
    list.appendChild(me); list.scrollTop = list.scrollHeight;

    // Add typing indicator
    const ai = document.createElement('div');
    ai.className = 'bubble ai';
    ai.innerHTML = '<i class="fa-solid fa-ellipsis fa-fade"></i> يفكر...';
    ai.style.color = 'var(--text-muted)';
    list.appendChild(ai); list.scrollTop = list.scrollHeight;

    this.history.push({ role: 'user', content: text });

    let reply = "";
    
    try {
        const token = localStorage.getItem('eco_token');
        if (!token) {
            throw new Error("عذراً، يجب تسجيل الدخول للوصول إلى المعلم الذكي.");
        }
        
        const response = await fetch(API_URL + '/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ messages: this.history })
        });
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error("عذراً، جلسة الدخول انتهت، يرجى إعادة تسجيل الدخول.");
            }
            throw new Error('Network error');
        }
        
        const data = await response.json();
        reply = data.choices[0].message.content;
        this.history.push({ role: 'assistant', content: reply });
    } catch (error) {
        console.error('AI Chat Error:', error);
        reply = `عذراً، حدث خطأ: ${error.message}`;
    }

    ai.style.color = '';
    ai.innerHTML = this.renderMarkdown(reply);
    renderMathIn(ai);
    list.scrollTop = list.scrollHeight;

    try {
      await dbAdd('ai_messages', {
        userMessage: text, aiReply: reply, date: new Date().toISOString()
      });
    } catch(e) {}
  }
};

/* ═══ LMS — Learning Path ═══ */
let lp = { subj: 'ar', idx: 0, step: 0, score: 0, mistakes: 0 };
const lpSteps = ['diag', 'concept', 'examples', 'progression', 'exercises', 'solutions', 'result'];

function openLessons(subj) {
  Sound.tap();
  switchLesson(subj);
  go('tab-lessons', 'nav-subs');
}
function switchLesson(subj) {
  Sound.tap();
  const ar = document.getElementById('sw-ar');
  const math = document.getElementById('sw-math');
  const lar = document.getElementById('lessons-ar');
  const lmath = document.getElementById('lessons-math');
  if (subj === 'ar') {
    if (ar) { ar.style.background = '#8dc63f'; ar.style.color = '#08080c'; }
    if (math) { math.style.background = 'transparent'; math.style.color = 'var(--text-muted)'; }
    if (lar) lar.style.display = 'block';
    if (lmath) lmath.style.display = 'none';
  } else {
    if (math) { math.style.background = '#8dc63f'; math.style.color = '#08080c'; }
    if (ar) { ar.style.background = 'transparent'; ar.style.color = 'var(--text-muted)'; }
    if (lmath) lmath.style.display = 'block';
    if (lar) lar.style.display = 'none';
  }
}
function renderLessons() {
  ['ar', 'math'].forEach(subj => {
    const box = document.getElementById('lessons-' + subj);
    if (!box) return;
    box.innerHTML = '';
    learningDB[subj].forEach((l, i) => {
      const el = document.createElement('div');
      el.className = 'lesson';
      el.onclick = () => openLp(subj, i);
      el.innerHTML = '<div class="lesson-num">0' + (i + 1) + '</div>' + 
                     '<div class="lesson-body"><h4>' + l.title + '</h4>' + 
                     '<p>' + l.subtitle + '</p></div>' + 
                     '<div class="lesson-go"><i class="fa-solid fa-arrow-left"></i></div>';
      box.appendChild(el);
    });
  });
}

function openLp(subj, idx) {
  Sound.tap();
  lp = { subj, idx, step: 0, score: 0, mistakes: 0 };
  const header = document.getElementById('lp-header');
  if (header) header.textContent = learningDB[subj][idx].title;
  openOverlay('lp');
  renderLp();
}

function askTeacherAboutLesson() {
  const currentTitle = learningDB[lp.subj][lp.idx].title;
  closeOverlay('lp');
  openOverlay('teacher');
  const input = document.getElementById('chat-in');
  if (input) {
    input.value = 'أنا أدرس الآن موضوع "' + currentTitle + '". اشرح لي هذا الدرس من فضلك، وأعطني مثالاً ثم تمريناً للتدرب عليه.';
    setTimeout(sendAIMessage, 500);
  }
}

function renderLp() {
  const key = lpSteps[lp.step];
  const data = learningDB[lp.subj][lp.idx][key];
  if (!data) return;
  const accent = lp.subj === 'ar' ? '#8dc63f' : '#10b981';

  const fill = document.getElementById('lp-fill');
  if (fill) {
    fill.style.width = ((lp.step / 6) * 100) + '%';
    fill.style.background = 'linear-gradient(90deg, ' + accent + ', ' + accent + 'dd)';
  }

  document.querySelectorAll('.lp-step').forEach(s => s.classList.remove('on'));
  const box = document.getElementById('lp-step-' + key);
  if (!box) return;
  box.classList.add('on'); box.innerHTML = '';

  const nextBtn = document.getElementById('lp-next');
  if (nextBtn) nextBtn.classList.remove('on');

  if (key === 'concept' || key === 'examples' || key === 'progression' || key === 'solutions') {
    box.innerHTML = `<div class="lp-question"><div class="lp-content">${data}</div></div>`;
    if (nextBtn) {
      nextBtn.classList.add('on');
      nextBtn.innerHTML = 'متابعة <i class="fa-solid fa-arrow-left"></i>';
    }
    renderMathIn(box);
  } else if (key === 'result') {
    const pct = Math.round((lp.score / 3) * 100);
    let badge, verdict, btn;
    if (pct >= 80) { badge = 'great'; verdict = 'مستوى إتقان ممتاز!'; btn = 'إنهاء'; Sound.ok(); }
    else if (pct >= 50) { badge = 'ok'; verdict = 'إتقان متوسط — راجع الدرس'; btn = 'إنهاء'; }
    else { badge = 'poor'; verdict = 'لم تصل بعد — أعد الدرس'; btn = 'إعادة'; Sound.err(); }
    box.innerHTML = `
      <div class="result-hero">
        <div class="result-badge ${badge}">${pct}%</div>
        <div class="result-title">نتيجة الدرس</div>
        <div class="result-sub">${verdict}</div>
        <div class="result-stats">
          <div class="result-stat ok"><h5>${lp.score}</h5><p>صحيحة</p></div>
          <div class="result-stat ko"><h5>${lp.mistakes}</h5><p>خاطئة</p></div>
        </div>
      </div>
    `;
    if (nextBtn) { nextBtn.classList.add('on'); nextBtn.textContent = btn; }
  } else if (key === 'diag' || key === 'exercises') {
    const isDiag = key === 'diag';
    const questions = isDiag ? [data] : data;
    const q = questions[0];
    let html = `<div class="lp-question">
      <div class="lp-kicker" style="color:${accent}">${isDiag ? 'التشخيص' : 'تمارين تطبيقية'}</div>
      <div class="lp-title">${q.q}</div>`;
    q.opts.forEach((o, i) => {
      const ex = (o.ex || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
      html += `<button class="opt" onclick="answerLp(this, ${o.c}, '${ex}')">${o.t}</button>`;
    });
    html += `<div class="feedback" id="lp-fb"></div></div>`;
    box.innerHTML = html;
    renderMathIn(box);
  }
}
async function answerLp(btn, correct, ex) {
  const box = btn.parentElement;
  box.querySelectorAll('.opt').forEach(o => {
    o.onclick = null;
    if (o !== btn) o.style.opacity = '.5';
  });
  const fb = box.querySelector('#lp-fb');
  if (fb) fb.classList.add('on');
  if (correct) {
    Sound.ok(); btn.classList.add('correct'); lp.score++;
    if (fb) { fb.classList.add('ok'); fb.innerHTML = `✅ ${ex || 'أحسنت!'}`; }
  } else {
    Sound.err(); btn.classList.add('wrong'); lp.mistakes++;
    if (fb) { fb.classList.add('ko'); fb.innerHTML = `❌ ${ex || 'راجع القاعدة.'}`; }
  }
  const nextBtn = document.getElementById('lp-next');
  if (nextBtn) nextBtn.classList.add('on');
  try {
    const r = await EcoDB.addXP(correct ? 15 : 3);
    if (r.leveledUp) toast(`🎖️ مستوى جديد: ${r.level}`, 'ok');
  } catch(e) {}
}
function nextLp() {
  Sound.tap();
  if (lp.step === 6) {
    try {
      EcoDB.saveAttempt({
        subject: lp.subj,
        year: new Date().getFullYear(),
        score: lp.score,
        total: 3,
        type: 'lesson',
        meta: { lessonIdx: lp.idx, lessonTitle: learningDB[lp.subj][lp.idx].title }
      });
    } catch(e) {}
    closeOverlay('lp');
    if (lp.score < 2) setTimeout(() => openLp(lp.subj, lp.idx), 400);
    return;
  }
  lp.step++;
  renderLp();
}

/* ═══ Archive ═══ */
const archiveYears = [];
for (let y = 2026; y >= 2020; y--) archiveYears.push(y);
let archSubj = 'ar', archYear = 2026;

const archive = {
  "ar": {},
  "math": {},
  "fr": {},
  "en": {},
  "physics": {},
  "science": {},
  "islamic": {},
  "civics": {},
  "history": {}
};

function renderYears() {
  const grid = document.getElementById('years');
  if (!grid) return;
  grid.innerHTML = '';
  const store = archive[archSubj] || {};
  archiveYears.forEach(y => {
    const has = !!store[y];
    const el = document.createElement('div');
    el.className = 'year' + (y === archYear ? ' on' : '');
    el.innerHTML = `<strong>${y}</strong><small>${has ? 'متاح' : 'قريباً'}</small>`;
    el.onclick = () => { Sound.tap(); archYear = y; renderYears(); loadExam(); };
    grid.appendChild(el);
  });
}
function setArchSubj(s, btn) {
  Sound.tap();
  archSubj = s;
  document.querySelectorAll('.chips .chip').forEach(c => c.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderYears();
  loadExam();
}
function loadExam() {
  const data = (archive[archSubj] || {})[archYear];
  const titleEl = document.getElementById('paper-title');
  const bodyEl = document.getElementById('paper-body');
  if (data) {
    if (titleEl) titleEl.textContent = data.title;
    if (bodyEl) bodyEl.innerHTML = data.paper;
    renderMathIn(bodyEl);
    const savedAttempt = localStorage.getItem(`bem-attempt-${archYear}-${archSubj}`);
    if (savedAttempt) {
      const ta = document.getElementById(`attempt-${archYear}-${archSubj}`);
      const sol = document.getElementById(`solution-${archYear}-${archSubj}`);
      if (ta && sol) {
        ta.value = savedAttempt;
        ta.readOnly = true;
        ta.style.border = '2px solid #10b981';
        ta.style.backgroundColor = '#fdfaf3';
        ta.style.color = '#064e3b';
        sol.style.display = 'block';
      }
    }
  } else {
    if (titleEl) titleEl.textContent = `دورة ${archYear}`;
    if (bodyEl) bodyEl.innerHTML = '<p style="text-align:center;padding:40px;color:#6b5d52">الموضوع قيد التحضير.</p>';
  }
}

/* ═══ Dashboard ═══ */
async function renderDashboard() {
  try {
    const d = await EcoDB.getDashboard();
    const box = document.getElementById('dashboard-content');
    if (!box) return;
    box.innerHTML = `
      <div class="grid-3" style="margin-bottom:24px">
        <div class="stat-tile">
          <div class="icon" style="background:rgba(141,198,63,.15);color:#a4d466">
            <i class="fa-solid fa-fire"></i>
          </div>
          <div><h4>${d.streak.current}</h4><p>يوم متتالٍ</p></div>
        </div>
        <div class="stat-tile">
          <div class="icon" style="background:rgba(14,165,233,.15);color:#38bdf8">
            <i class="fa-solid fa-clock"></i>
          </div>
          <div><h4>${d.totalStudyHours}h</h4><p>وقت الدراسة</p></div>
        </div>
        <div class="stat-tile">
          <div class="icon" style="background:rgba(16,185,129,.15);color:#34d399">
            <i class="fa-solid fa-bolt"></i>
          </div>
          <div><h4>${d.xp}</h4><p>XP · مستوى ${d.level}</p></div>
        </div>
      </div>
      <div class="card" style="margin-bottom:22px">
        <div class="section-label">التقدّم للمستوى ${d.level + 1}</div>
        <div class="mastery">
          <div class="mastery-head">
            <strong>${d.xp} / ${d.nextLevelXP} XP</strong>
            <span style="color:#a4d466">${d.levelProgress}%</span>
          </div>
          <div class="mastery-track">
            <div class="mastery-fill" style="width:${d.levelProgress}%"></div>
          </div>
        </div>
      </div>
      <div class="grid-4" style="margin-bottom:22px">
        <div class="stat-tile">
          <div class="icon" style="background:rgba(141,198,63,.15);color:#a4d466">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <div><h4>${d.totalAttempts}</h4><p>محاولة</p></div>
        </div>
        <div class="stat-tile">
          <div class="icon" style="background:rgba(251,191,36,.15);color:#fbbf24">
            <i class="fa-solid fa-trophy"></i>
          </div>
          <div><h4>${d.achievements}</h4><p>إنجاز</p></div>
        </div>
        <div class="stat-tile">
          <div class="icon" style="background:rgba(16,185,129,.15);color:#34d399">
            <i class="fa-solid fa-medal"></i>
          </div>
          <div><h4>${d.streak.best}</h4><p>أفضل سلسلة</p></div>
        </div>
        <div class="stat-tile">
          <div class="icon" style="background:rgba(14,165,233,.15);color:#38bdf8">
            <i class="fa-solid fa-layer-group"></i>
          </div>
          <div><h4>${d.recentAchievements.length}</h4><p>حديث</p></div>
        </div>
      </div>
    `;
    const myXp = document.getElementById('my-xp');
    if (myXp) myXp.textContent = `${d.xp} XP`;
    const accXp = document.getElementById('acc-xp');
    if (accXp) accXp.textContent = d.xp;
  } catch(e) {
    console.error('Dashboard error:', e);
    const box = document.getElementById('dashboard-content');
    if (box) box.innerHTML = '<div class="card" style="text-align:center;color:#ef4444">⚠️ فشل تحميل الإحصائيات</div>';
  }
}

/* ═══ AI Teacher ═══ */

function sendAIMessage() {
  const i = document.getElementById('chat-in');
  if (!i) return;
  const t = i.value.trim(); if (!t) return;
  i.value = ''; AITeacher.send(t);
}

/* ═══ Zen ═══ */
const moods = {
  fear: ["🛡️ **الخطوة 1:** الخوف شعور طبيعي. المعلومات في ذاكرتك.", "🧠 **الخطوة 2:** تنفّس بعمق واقرأ السند بتؤدة.", "⭐ **الخطوة 3:** ثق بما راجعته."],
  scattered: ["🎯 **الخطوة 1:** طبّق قاعدة الـ 5 دقائق.", "☕ **الخطوة 2:** خذ استراحة 5 دقائق.", "🏆 **الخطوة 3:** تذكّر هدفك."],
  time: ["⏳ **الخطوة 1:** ساعتان تكفيان لمراجعة درس.", "🧭 **الخطوة 2:** تجاوز السؤال الصعب.", "✨ **الخطوة 3:** الهدوء هو السر."],
  ready: ["🚀 **الخطوة 1:** استثمر حماسك.", "💎 **الخطوة 2:** ركّز على الأفخاخ.", "👑 **الخطوة 3:** واصل."],
  tired: ["🛌 **الخطوة 1:** خذ قسطاً من الراحة، عقلك يحتاج للهدوء.", "💧 **الخطوة 2:** اشرب بعض الماء واستمع للموسيقى الهادئة.", "💤 **الخطوة 3:** النوم الجيد هو مفتاح التركيز."],
  bored: ["🎨 **الخطوة 1:** غير مكان دراستك أو طريقة مراجعتك.", "🧩 **الخطوة 2:** جرب حل تحدي جديد بدلاً من القراءة.", "🎁 **الخطوة 3:** خذ استراحة قصيرة وكافئ نفسك."],
  lost: ["🗺️ **الخطوة 1:** لا بأس، ابدأ من نقطة صغيرة ومألوفة.", "🤖 **الخطوة 2:** اطلب المساعدة من المرشد الجزاء صغيرة جداً."],
  confident: ["🌟 **الخطوة 1:** ممتاز! شارك معرفتك مع زملائك.", "🔥 **الخطوة 2:** اختبر نفسك بأسئلة أصعب.", "🏅 **الخطوة 3:** أنت على الطريق الصحيح، استمر!"]
};

const moodLabels = {
  fear: '😟 خائف من النسيان',
  scattered: '🌀 مشتت ذهنياً',
  time: '⏳ ضغط الوقت يربكني',
  ready: '🚀 متحمس وطاقتي عالية',
  tired: '😴 أشعر بالإرهاق',
  bored: '🥱 أشعر بالملل',
  lost: '❓ تائه ولا أعرف من أين أبدأ',
  confident: '😎 واثق من نفسي'
};

function generateMoodButtons() {
    const grid = document.getElementById('dynamic-mood-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    // Pick 4 random moods
    const keys = Object.keys(moodLabels);
    const shuffled = keys.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 4);
    
    selected.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'mood';
        btn.onclick = function() { pickMood(this, key); };
        btn.innerText = moodLabels[key];
        grid.appendChild(btn);
    });
}

let moodKey = null, moodIdx = 0;
function pickMood(btn, key) {
  Sound.tap();
  document.querySelectorAll('.mood').forEach(m => m.classList.remove('on'));
  btn.classList.add('on');
  moodKey = key; moodIdx = 0;
  const resp = document.getElementById('mood-resp');
  if (resp) resp.classList.add('on');
  renderMood();
  try { EcoDB.logMood(key); } catch(e) {}
}
function renderMood() {
  const el = document.getElementById('mood-text');
  if (el && moodKey) el.innerHTML = AITeacher.renderMarkdown(moods[moodKey][moodIdx]);
}
function nextMood() {
  Sound.ok();
  moodIdx++;
  if (moodIdx >= moods[moodKey].length) moodIdx = 0;
  renderMood();
}

let breathing = false, breathTimer = null;
function toggleBreath() { breathing ? stopBreath() : startBreath(); }
function startBreath() {
  breathing = true; Sound.ok();
  const btn = document.getElementById('breath-btn');
  if (btn) btn.textContent = 'إيقاف';
  const ball = document.getElementById('ball');
  const label = document.getElementById('breath-label');
  function cycle() {
    if (!breathing) return;
    if (label) label.textContent = 'شهيق...';
    if (ball) ball.className = 'breath-ball grow';
    setTimeout(() => {
      if (!breathing) return;
      if (label) label.textContent = 'احبس...';
      if (ball) ball.className = 'breath-ball grow hold';
      setTimeout(() => {
        if (!breathing) return;
        if (label) label.textContent = 'زفير...';
        if (ball) ball.className = 'breath-ball';
      }, 4000);
    }, 4000);
  }
  cycle();
  breathTimer = setInterval(cycle, 12000);
}
function stopBreath() {
  breathing = false;
  clearInterval(breathTimer);
  const ball = document.getElementById('ball');
  if (ball) ball.className = 'breath-ball';
  const label = document.getElementById('breath-label');
  if (label) label.textContent = 'جاهز؟';
  const btn = document.getElementById('breath-btn');
  if (btn) btn.textContent = 'ابدأ الجلسة';
}

let pomoSec = 25 * 60, pomoTimer = null, pomoRun = false;
function renderPomo() {
  const m = Math.floor(pomoSec / 60), s = pomoSec % 60;
  const el = document.getElementById('pomo');
  if (el) el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function togglePomo() {
  Sound.tap();
  const btn = document.getElementById('pomo-btn');
  if (pomoRun) {
    clearInterval(pomoTimer); pomoRun = false;
    if (btn) btn.textContent = 'استئناف';
  } else {
    pomoRun = true;
    if (btn) btn.textContent = 'إيقاف';
    pomoTimer = setInterval(() => {
      if (pomoSec > 0) { pomoSec--; renderPomo(); }
      else {
        clearInterval(pomoTimer); pomoRun = false;
        Sound.ok(); toast('🎉 انتهت الجلسة!', 'ok');
        EcoDB.logSession('pomodoro', 25 * 60, { complete: true }).catch(() => {});
        EcoDB.addXP(25).catch(() => {});
        resetPomo();
      }
    }, 1000);
  }
}
function resetPomo() {
  clearInterval(pomoTimer); pomoRun = false;
  pomoSec = 25 * 60;
  renderPomo();
  const btn = document.getElementById('pomo-btn');
  if (btn) btn.textContent = 'بدء';
}

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

/* ═══ Analytics ═══ */
function renderAnalytics() {
  const box = document.getElementById('analytics-content');
  if (!box) return;
  
  let stats = [];
  try {
      stats = JSON.parse(localStorage.getItem('eco_bem_stats_v2')) || [];
  } catch(e) {}
  
  const coins = parseInt(localStorage.getItem('eco_user_coins_v2')) || 0;
  
  if (stats.length === 0 && coins === 0) {
      box.innerHTML = `
        <div class="card" style="text-align:center; padding:40px;">
          <div class="section-label" style="text-align:center;">📊 التحليلات البيانية</div>
          <p style="color:var(--text-muted); margin-top:20px;">
            ابدأ بحل الحوليات والاختبارات لتسجيل نشاطك وعرض التحليلات هنا.
          </p>
        </div>
      `;
      return;
  }
  
  let historyHtml = stats.map(s => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); margin-bottom:8px; border-radius:10px;">
        <div>
            <div style="font-weight:bold; color:white;">${s.reason || 'نشاط'}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">${s.date}</div>
        </div>
        <div style="color:#10b981; font-weight:bold;">+${s.amount} 🪙</div>
    </div>
  `).join('');
  
  box.innerHTML = `
    <div class="card" style="margin-bottom:15px; background:linear-gradient(135deg, #2b5876, #4e4376);">
      <h3 style="color:white; margin-bottom:10px;">إجمالي النقاط المكتسبة</h3>
      <div style="font-size:3rem; font-weight:900; color:#fbbf24;">${coins} 🪙</div>
      <div style="color:rgba(255,255,255,0.7); font-size:0.9rem;">استمر في المراجعة لجمع المزيد!</div>
    </div>
    
    <div class="card">
      <div class="section-label" style="margin-bottom:15px;">⏱️ أحدث النشاطات</div>
      ${historyHtml || '<p style="color:var(--text-muted);">لا توجد نشاطات مسجلة بعد.</p>'}
    </div>
  `;
}

/* ═══ Notifications Panel ═══ */
function renderNotifSettings() {
  const box = document.getElementById('notif-content');
  if (!box) return;
  
  // Load settings
  const sDaily = localStorage.getItem('eco_notif_daily') !== 'false';
  const sQuests = localStorage.getItem('eco_notif_quests') !== 'false';
  const sAI = localStorage.getItem('eco_notif_ai') !== 'false';
  const sSound = localStorage.getItem('eco_notif_sound') !== 'false';

  box.innerHTML = `
    <div class="card">
      <div class="section-label">إعدادات الإشعارات</div>
      <div style="display:flex;flex-direction:column;gap:5px;margin-top:10px;">
        
        <label style="display:flex;align-items:center;cursor:pointer;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <div>
            <div style="font-weight:600"><i class="fa-solid fa-calendar-check" style="color:#10b981;margin-left:8px;width:18px"></i> تذكير يومي بالدراسة</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">يصلك إشعار لتذكيرك بإنهاء وردك اليومي والمراجعة</div>
          </div>
          <input type="checkbox" id="notif-daily" style="width:20px;height:20px;accent-color:#a855f7;cursor:pointer;" ${sDaily ? 'checked' : ''} onchange="saveNotifSettings()">
        </label>

        <label style="display:flex;align-items:center;cursor:pointer;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <div>
            <div style="font-weight:600"><i class="fa-solid fa-map-location-dot" style="color:#f59e0b;margin-left:8px;width:18px"></i> تنبيهات واحة التدريب</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">إعلامك عند توفر مهام جديدة لجمع نقاط XP والعملات</div>
          </div>
          <input type="checkbox" id="notif-quests" style="width:20px;height:20px;accent-color:#a855f7;cursor:pointer;" ${sQuests ? 'checked' : ''} onchange="saveNotifSettings()">
        </label>

        <label style="display:flex;align-items:center;cursor:pointer;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <div>
            <div style="font-weight:600"><i class="fa-solid fa-robot" style="color:#3b82f6;margin-left:8px;width:18px"></i> رسائل المعلم الذكي (AI)</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">رسائل تحفيزية ونصائح مخصصة من معلمك الذكي</div>
          </div>
          <input type="checkbox" id="notif-ai" style="width:20px;height:20px;accent-color:#a855f7;cursor:pointer;" ${sAI ? 'checked' : ''} onchange="saveNotifSettings()">
        </label>

        <label style="display:flex;align-items:center;cursor:pointer;justify-content:space-between;padding:12px 0;">
          <div>
            <div style="font-weight:600"><i class="fa-solid fa-volume-high" style="color:#a855f7;margin-left:8px;width:18px"></i> أصوات التنبيهات</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">تشغيل المؤثرات الصوتية عند وصول إشعار جديد</div>
          </div>
          <input type="checkbox" id="notif-sound" style="width:20px;height:20px;accent-color:#a855f7;cursor:pointer;" ${sSound ? 'checked' : ''} onchange="saveNotifSettings()">
        </label>

      </div>
    </div>
  `;
}

window.saveNotifSettings = function() {
  localStorage.setItem('eco_notif_daily', document.getElementById('notif-daily').checked);
  localStorage.setItem('eco_notif_quests', document.getElementById('notif-quests').checked);
  localStorage.setItem('eco_notif_ai', document.getElementById('notif-ai').checked);
  localStorage.setItem('eco_notif_sound', document.getElementById('notif-sound').checked);
  
  if (typeof Sound !== 'undefined' && typeof Sound.tap === 'function') {
      if (document.getElementById('notif-sound').checked) Sound.tap();
  }
};

/* ═══ Core Functions ═══ */
let appEntered = false;
function enterApp() {
  renderAnnalsSubjects();
  initCustomSelects();
    if (appEntered) return;
    appEntered = true;
    Sound.ok();
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('gone');
    
    // AUTHENTICATION CHECK
    if (!localStorage.getItem('eco_token')) {
      const authOv = document.getElementById('ov-auth');
      if(authOv) {
        const savedEmail = localStorage.getItem('eco_saved_email');
        if (savedEmail) {
          const emailInput = document.getElementById('login-email');
          if (emailInput) emailInput.value = savedEmail;
        }
        authOv.style.display = 'flex';
        authOv.style.opacity = '1';
        authOv.classList.add('on');
        const authBack = authOv.querySelector('.back');
        if (authBack) authBack.style.display = 'none';
      }
      return; // Stop loading app until logged in
    }

    setTimeout(() => {
      try {
        loadTheme();
        renderUserName();
        renderLessons();
        renderYears();
        loadExam();
        renderCard();
      } catch(e) { console.error('[Init]', e); }
    }, 300);
  }

function toggleTheme() {
  Sound.tap();
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  const btn = document.getElementById('themeBtn');
  if (btn) btn.innerHTML = `<i class="fa-solid fa-${isLight ? 'moon' : 'sun'}"></i>`;
  try { localStorage.setItem('eco-theme', isLight ? 'light' : 'dark'); } catch(e) {}
}
function loadTheme() {
  try {
    let theme = localStorage.getItem('eco-theme');
    if (!theme) {
      const h = new Date().getHours();
      theme = (h >= 18 || h < 6) ? 'dark' : 'light';
    }
    const btn = document.getElementById('themeBtn');
    if (theme === 'light') {
      document.body.classList.add('light');
      if (btn) btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
      if (btn) btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
  } catch(e) {}
}
function toggleDrawer(open) {
  Sound.tap();
  const d = document.getElementById('drawer');
  const b = document.getElementById('backdrop');
  if (d) d.classList.toggle('on', open);
  if (b) b.classList.toggle('on', open);
}
function openOverlay(id) {
  Sound.tap();
  const el = document.getElementById('ov-' + id);
  if (!el) return;
  el.classList.add('on');
  if (id === 'stats2') renderAnalytics();
  else if (id === 'zen') generateMoodButtons();
  else if (id === 'notif') renderNotifSettings();
  else if (id === 'sync') renderSyncPanel(); 
  
  else if (id === 'rank' && typeof window.loadLeaderboard === 'function') window.loadLeaderboard();
}

// --- AI FLASHCARDS ---
let aiFlashData = [];
let aiFlashIdx = 0;
let flashCardFlipped = false;

async function startAIFlashcards() {
    const subject = document.getElementById('flash-subject').value;
    document.getElementById('flash-setup').style.display = 'none';
    document.getElementById('flash-loading').style.display = 'block';
    
    
    const prompt = `قم بتوليد 5 بطاقات استذكار (Flashcards) لمراجعة أهم المفاهيم في مادة ${subject} في مستوى شهادة التعليم المتوسط (BEM) في الجزائر.
الرد يجب أن يكون حصراً بصيغة JSON array فقط، كل عنصر يحتوي على:
{
  "term": "المفهوم أو المصطلح",
  "definition": "الشرح المبسط"
}
لا تضف أي نص آخر قبل أو بعد الـ JSON.`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout
        
        const token = localStorage.getItem('eco_token');
        const response = await fetch(API_URL + '/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('Backend API error or unauthorized');
        const data = await response.json();
        if (!data.choices || !data.choices[0].message.content) throw new Error('Invalid response from AI');
        
        let text = data.choices[0].message.content;
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        aiFlashData = JSON.parse(text);
        
        document.getElementById('flash-loading').style.display = 'none';
        document.getElementById('flash-play').style.display = 'block';
        aiFlashIdx = 0;
        flashCardFlipped = false;
        renderAIFlashcard();
    } catch (e) {
        console.warn('AI Flashcards failed, using fallback data:', e.message);
        
        // Fallback realistic BEM flashcards
        if (subject.includes('تاريخ') || subject.includes('جغرافيا') || subject.includes('اجتماعيات')) {
            aiFlashData = [
                { term: 'بيان أول نوفمبر', definition: 'أول وثيقة لجبهة التحرير الوطني، للإعلان عن انطلاق الثورة وتحديد أهدافها.' },
                { term: 'مؤتمر الصومام', definition: 'عقد في 20 أوت 1956، لتقييم المرحلة الأولى من الثورة وتنظيمها.' },
                { term: 'مشروع قسنطينة', definition: 'مشروع إغرائي أطلقه ديغول سنة 1958 لعزل الثورة عن الشعب الجزائري.' },
                { term: 'التنظيم الإداري للجزائر', definition: 'مقسمة إلى 58 ولاية لتسهيل التسيير وتقريب الإدارة.' },
                { term: 'الزلازل في الجزائر', definition: 'تتركز في الشمال بسبب وقوع الجزائر في منطقة التقاء الصفيحتين.' }
            ];
        } else if (subject.includes('علوم') || subject.includes('طبيعة')) {
            aiFlashData = [
                { term: 'الزغابة المعوية', definition: 'مقر الامتصاص المعوي، تتميز بجدار رفيع وغنية بالشعيرات الدموية.' },
                { term: 'الكريات الدموية الحمراء', definition: 'خلايا دموية خالية من النواة، دورها نقل الغازات التنفسية.' },
                { term: 'المشبك (Synapse)', definition: 'منطقة اتصال بين عصبونين، يتم فيها انتقال الرسالة العصبية.' },
                { term: 'الاستجابة المناعية', definition: 'تتدخل فيها الخلايا اللمفاوية للقضاء على المستضد بشكل دقيق.' },
                { term: 'اللقاح', definition: 'ميكروب ميت أو مضعف يُكسب الجسم مناعة اصطناعية نشطة.' }
            ];
        } else if (subject.includes('رياضيات') || subject.includes('حساب')) {
            aiFlashData = [
                { term: 'نظرية طالس', definition: 'تستعمل لحساب الأطوال في مثلثين معينين بمستقيمين متوازيين يقطعهما قاطعان.' },
                { term: 'القاسم المشترك الأكبر', definition: 'هو أكبر عدد يقسم عددين طبيعيين في نفس الوقت.' },
                { term: 'الدالة التآلفية', definition: 'هي دالة تكتب على الشكل f(x) = ax + b حيث a و b عددان حقيقيان.' },
                { term: 'نظرية فيثاغورس', definition: 'في مثلث قائم، مربع الوتر يساوي مجموع مربعي الضلعين القائمين.' },
                { term: 'المتراجحة', definition: 'متباينة تحتوي على مجهول، وحلها يعني إيجاد كل القيم التي تحقق المتباينة.' }
            ];
        } else if (subject.includes('عربية') || subject.includes('لغة')) {
            aiFlashData = [
                { term: 'الجملة الاسمية', definition: 'الجملة التي تبدأ باسم، وتتكون أساساً من مبتدأ وخبر.' },
                { term: 'الطباق', definition: 'محسن بديعي معنوي، وهو الجمع بين الكلمة وضدها في الكلام.' },
                { term: 'الاستعارة المكنية', definition: 'تشبيه بليغ حُذف منه المشبه به ورُمز له بشيء من لوازمه.' },
                { term: 'عطف البيان', definition: 'تابع جامد يشبه النعت في توضيح متبوعه ولكنه ليس مشتقاً.' },
                { term: 'الجناس', definition: 'محسن لفظي، وهو تشابه كلمتين في اللفظ واختلافهما في المعنى.' }
            ];
        } else {
            aiFlashData = [
                { term: 'حقوق المواطن', definition: 'مجموعة من الامتيازات التي يكفلها الدستور لكل فرد في المجتمع.' },
                { term: 'الإسلام', definition: 'دين الرحمة والتسامح، مبني على خمسة أركان أساسية.' },
                { term: 'التكنولوجيا', definition: 'تطبيق المعرفة العلمية لأغراض عملية في حياة الإنسان.' },
                { term: 'البيئة', definition: 'المحيط الذي نعيش فيه ويشمل المكونات الحية وغير الحية.' },
                { term: 'النجاح', definition: 'ثمرة الاجتهاد والمثابرة والتنظيم الجيد للوقت.' }
            ];
        }
    } // <-- MISSING BRACE ADDED HERE

    document.getElementById('flash-loading').style.display = 'none';
    document.getElementById('flash-play').style.display = 'block';
        aiFlashIdx = 0;
        flashCardFlipped = false;
        renderAIFlashcard();
}

function renderAIFlashcard() {
    if (aiFlashIdx >= aiFlashData.length) {
        document.getElementById('flash-play').style.display = 'none';
        document.getElementById('flash-result').style.display = 'block';
        try { EcoDB.addXP(50); } catch(e) {}
        return;
    }
    const card = aiFlashData[aiFlashIdx];
    const fc = document.getElementById('fc');
    fc.style.transform = 'none';
    flashCardFlipped = false;
    
    document.getElementById('fc-text').textContent = card.term;
    document.getElementById('fc-hint').textContent = 'اضغط لمعرفة الشرح';
    const prog = document.getElementById('flash-progress');
    if(prog) prog.textContent = `بطاقة ${aiFlashIdx + 1} من ${aiFlashData.length}`;
}

window.flipCard = function() {
    const card = aiFlashData[aiFlashIdx];
    if (!card) return;
    flashCardFlipped = !flashCardFlipped;
    const fc = document.getElementById('fc');
    if (flashCardFlipped) {
        fc.style.transform = 'rotateX(180deg)';
        setTimeout(() => {
            fc.style.transform = 'none';
            document.getElementById('fc-text').textContent = card.definition;
            document.getElementById('fc-hint').textContent = 'الشرح';
        }, 150);
    } else {
        fc.style.transform = 'rotateX(180deg)';
        setTimeout(() => {
            fc.style.transform = 'none';
            document.getElementById('fc-text').textContent = card.term;
            document.getElementById('fc-hint').textContent = 'اضغط لمعرفة الشرح';
        }, 150);
    }
    Sound.tap();
}

window.nextCard = function() {
    Sound.tap();
    aiFlashIdx++;
    renderAIFlashcard();
}

window.prevCard = function() {
    Sound.tap();
    if (aiFlashIdx > 0) {
        aiFlashIdx--;
        renderAIFlashcard();
    }
}

window.resetFlashcards = function() {
    document.getElementById('flash-setup').style.display = 'block';
    document.getElementById('flash-loading').style.display = 'none';
    document.getElementById('flash-play').style.display = 'none';
    document.getElementById('flash-result').style.display = 'none';
}


// --- AI QUIZ ---
let aiQuizData = [];
let aiQuizIdx = 0;
let aiQuizScore = 0;

window.startAIQuiz = async function() {
    const subject = document.getElementById('quiz-subject').value;
    document.getElementById('quiz-setup').style.display = 'none';
    document.getElementById('quiz-loading').style.display = 'block';
    
    
    const prompt = `قم بتوليد 5 أسئلة اختيار من متعدد (QCM) لمادة ${subject} في مستوى شهادة التعليم المتوسط (BEM) في الجزائر.
الرد يجب أن يكون حصراً بصيغة JSON array فقط، كل عنصر يحتوي على:
{
  "q": "نص السؤال هنا",
  "opts": [
    {"t": "الخيار الأول", "c": false},
    {"t": "الخيار الصحيح", "c": true},
    {"t": "الخيار الثالث", "c": false},
    {"t": "الخيار الرابع", "c": false}
  ]
}
لا تضف أي نص آخر قبل أو بعد الـ JSON.`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout
        
        const token = localStorage.getItem('eco_token');
        const response = await fetch(API_URL + '/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('Backend API error or unauthorized');
        const data = await response.json();
        if (!data.choices || !data.choices[0].message.content) throw new Error('Invalid response from AI');
        
        let text = data.choices[0].message.content;
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        aiQuizData = JSON.parse(text);
        
    } catch (e) {
        console.warn('AI Quiz failed, using fallback data:', e.message);
        // Fallback realistic BEM Quiz data
        if (subject.includes('تاريخ') || subject.includes('جغرافيا') || subject.includes('اجتماعيات')) {
            aiQuizData = [
                { q: "متى تم عقد مؤتمر الصومام؟", opts: [ { t: "1954", c: false }, { t: "1956", c: true }, { t: "1958", c: false }, { t: "1962", c: false } ] },
                { q: "ما هو الهدف الرئيسي لمشروع قسنطينة؟", opts: [ { t: "دعم الثورة", c: false }, { t: "عزل الثورة عن الشعب", c: true }, { t: "تطوير التعليم", c: false }, { t: "بناء جيش فرنسي", c: false } ] },
                { q: "كم عدد الولايات في التقسيم الإداري الجديد للجزائر؟", opts: [ { t: "48 ولاية", c: false }, { t: "58 ولاية", c: true }, { t: "68 ولاية", c: false }, { t: "50 ولاية", c: false } ] },
                { q: "أين تتركز الزلازل في الجزائر بشكل رئيسي؟", opts: [ { t: "في الصحراء", c: false }, { t: "في الهضاب العليا", c: false }, { t: "في الشريط الساحلي والشمال", c: true }, { t: "في الجنوب الغربي", c: false } ] },
                { q: "في أي سنة اندلعت الثورة التحريرية الجزائرية؟", opts: [ { t: "1 نوفمبر 1954", c: true }, { t: "5 جويلية 1962", c: false }, { t: "8 ماي 1945", c: false }, { t: "20 أوت 1955", c: false } ] }
            ];
        } else if (subject.includes('علوم') || subject.includes('طبيعة')) {
            aiQuizData = [
                { q: "أين يتم امتصاص المغذيات في جسم الإنسان؟", opts: [ { t: "في المعدة", c: false }, { t: "في الزغابة المعوية", c: true }, { t: "في المعي الغليظ", c: false }, { t: "في الكبد", c: false } ] },
                { q: "ما هو دور الكريات الدموية الحمراء؟", opts: [ { t: "الدفاع عن الجسم", c: false }, { t: "تخثر الدم", c: false }, { t: "نقل الغازات التنفسية", c: true }, { t: "نقل المغذيات فقط", c: false } ] },
                { q: "ما هو المشبك؟", opts: [ { t: "عظمة في اليد", c: false }, { t: "خلية دموية", c: false }, { t: "منطقة اتصال بين عصبونين", c: true }, { t: "غدة هاضمة", c: false } ] },
                { q: "أي الخلايا مسؤولة عن الاستجابة المناعية النوعية الخلطية؟", opts: [ { t: "البلعميات", c: false }, { t: "الخلايا اللمفاوية البائية (LB)", c: true }, { t: "الكريات الحمراء", c: false }, { t: "الخلايا اللمفاوية التائية (LT)", c: false } ] },
                { q: "اللقاح يكسب الجسم مناعة...", opts: [ { t: "سلبية ومؤقتة", c: false }, { t: "طبيعية وفطرية", c: false }, { t: "نشطة وطويلة المدى", c: true }, { t: "لا يكسب أي مناعة", c: false } ] }
            ];
        } else if (subject.includes('رياضيات') || subject.includes('حساب')) {
            aiQuizData = [
                { q: "ما هو القاسم المشترك الأكبر (PGCD) للعددين 12 و 18؟", opts: [ { t: "2", c: false }, { t: "6", c: true }, { t: "4", c: false }, { t: "3", c: false } ] },
                { q: "في نظرية طالس، ماذا ينتج عن مستقيمين متوازيين يقطعهما قاطعان؟", opts: [ { t: "مثلثات متقايسة", c: false }, { t: "نسب أطوال متساوية", c: true }, { t: "زوايا قائمة", c: false }, { t: "دوائر متطابقة", c: false } ] },
                { q: "حل المتراجحة 2x > 4 هو:", opts: [ { t: "x = 2", c: false }, { t: "x < 2", c: false }, { t: "x > 2", c: true }, { t: "x > 4", c: false } ] },
                { q: "الدالة التآلفية تكتب على الشكل:", opts: [ { t: "f(x) = ax", c: false }, { t: "f(x) = x^2", c: false }, { t: "f(x) = ax + b", c: true }, { t: "f(x) = a/x", c: false } ] },
                { q: "في مثلث قائم، حسب نظرية فيثاغورس:", opts: [ { t: "مربع الوتر يساوي مجموع مربعي الضلعين القائمين", c: true }, { t: "الوتر يساوي مجموع الضلعين", c: false }, { t: "الوتر هو أصغر ضلع", c: false }, { t: "الزاوية القائمة قياسها 180", c: false } ] }
            ];
        } else if (subject.includes('عربية') || subject.includes('لغة')) {
            aiQuizData = [
                { q: "كيف تسمى الجملة التي تبدأ باسم؟", opts: [ { t: "جملة فعلية", c: false }, { t: "جملة شبه جملة", c: false }, { t: "جملة اسمية", c: true }, { t: "جملة شرطية", c: false } ] },
                { q: "الجمع بين الكلمة وضدها في نفس الجملة يسمى:", opts: [ { t: "جناس", c: false }, { t: "طباق", c: true }, { t: "سجع", c: false }, { t: "مقابلة", c: false } ] },
                { q: "التشبيه البليغ الذي حُذف منه المشبه به ورُمز له بشيء من لوازمه هو:", opts: [ { t: "استعارة تصريحية", c: false }, { t: "استعارة مكنية", c: true }, { t: "تشبيه تام", c: false }, { t: "كناية", c: false } ] },
                { q: "ما هو عطف البيان؟", opts: [ { t: "تابع جامد يوضح متبوعه", c: true }, { t: "اسم مرفوع دائماً", c: false }, { t: "فعل ماضٍ مبني", c: false }, { t: "حرف جر", c: false } ] },
                { q: "من المحسنات البديعية اللفظية:", opts: [ { t: "الطباق", c: false }, { t: "المقابلة", c: false }, { t: "الجناس", c: true }, { t: "التشبيه", c: false } ] }
            ];
        } else {
            aiQuizData = [
                { q: "ما هي عاصمة الجزائر؟", opts: [ { t: "وهران", c: false }, { t: "الجزائر العاصمة", c: true }, { t: "عنابة", c: false }, { t: "قسنطينة", c: false } ] },
                { q: "من بنى مسجد باريس؟", opts: [ { t: "عبد الحميد بن باديس", c: false }, { t: "قدور بن غبريط", c: true }, { t: "الأمير عبد القادر", c: false }, { t: "مصالي الحاج", c: false } ] },
                { q: "ما هو أطول نهر في العالم؟", opts: [ { t: "الأمازون", c: false }, { t: "دجلة", c: false }, { t: "النيل", c: true }, { t: "الدانوب", c: false } ] },
                { q: "متى استقلت الجزائر؟", opts: [ { t: "1954", c: false }, { t: "1962", c: true }, { t: "1945", c: false }, { t: "1960", c: false } ] },
                { q: "كم عدد أركان الإسلام؟", opts: [ { t: "3", c: false }, { t: "4", c: false }, { t: "5", c: true }, { t: "6", c: false } ] }
            ];
        }
    } // <-- MISSING BRACE ADDED HERE

    document.getElementById('quiz-loading').style.display = 'none';
    document.getElementById('quiz-box').style.display = 'block';
    aiQuizIdx = 0;
    aiQuizScore = 0;
    renderAIQuiz();
}

function renderAIQuiz() {
    if (aiQuizIdx >= aiQuizData.length) {
        finishAIQuiz();
        return;
    }
    const q = aiQuizData[aiQuizIdx];
    const p = document.getElementById('quiz-progress-text');
    if(p) p.textContent = `السؤال ${aiQuizIdx + 1} من ${aiQuizData.length}`;
    document.getElementById('quiz-title').textContent = q.q;
    const optsDiv = document.getElementById('quiz-opts');
    optsDiv.innerHTML = '';
    
    q.opts.sort(() => Math.random() - 0.5); // Shuffle
    
    q.opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'opt';
        btn.innerHTML = `<span>${opt.t}</span> <i class="fa-solid fa-circle"></i>`;
        btn.onclick = () => {
            if (opt.c) {
                btn.classList.add('correct');
                Sound.ok();
                aiQuizScore++;
            } else {
                btn.classList.add('wrong');
                Sound.err();
                optsDiv.childNodes.forEach(child => {
                    if (child.innerText.includes(q.opts.find(o => o.c).t)) child.classList.add('correct');
                });
            }
            optsDiv.childNodes.forEach(c => c.style.pointerEvents = 'none');
            setTimeout(() => { aiQuizIdx++; renderAIQuiz(); }, 1500);
        };
        optsDiv.appendChild(btn);
    });
}

async function finishAIQuiz() {
    document.getElementById('quiz-box').style.display = 'none';
    document.getElementById('quiz-result').style.display = 'block';
    document.getElementById('quiz-score').textContent = `النتيجة: ${aiQuizScore} / ${aiQuizData.length}`;
    const xpEarned = aiQuizScore * 10;
    document.getElementById('quiz-xp').textContent = `+${xpEarned} XP`;
    try {
        await EcoDB.addXP(xpEarned);
    } catch(e) {}
}

window.resetQuiz = function() {
    document.getElementById('quiz-setup').style.display = 'block';
    document.getElementById('quiz-loading').style.display = 'none';
    document.getElementById('quiz-box').style.display = 'none';
    document.getElementById('quiz-result').style.display = 'none';
}

  function closeOverlay(id) {
  Sound.tap();
  const el = document.getElementById('ov-' + id);
  if (el) el.classList.remove('on');
}
function togglePremium(open, name) {
  Sound.tap();
  if (name) {
    const el = document.getElementById('premium-title');
    if (el) el.textContent = `مادة ${name} متوفرة في النسخة الشاملة`;
  }
  const p = document.getElementById('premium');
  if (p) p.classList.toggle('on', open);
}
function openPayments() {
  togglePremium(false);
  Sound.tap();
  go('tab-pricing', null);
}
function contactForPayment(plan) {
  window.open(`https://wa.me/213697454244?text=${encodeURIComponent(`أريد تفعيل اشتراك ECO-BEM PRO (${plan})`)}`, '_blank');
}
function go(tabId, navId) {
  Sound.tap();
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add('on');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('on'));
  if (navId) {
    const btn = document.getElementById(navId);
    if (btn) btn.classList.add('on');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (tabId === 'tab-stats') renderDashboard();
  else if (tabId === 'tab-lessons') renderLessons();
  else if (tabId === 'tab-archive') { renderYears(); loadExam(); }
}

/* ═══ ESC Close ═══ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.on').forEach(o => {
        if (o.id !== 'ov-auth') o.classList.remove('on');
      });
    const p = document.getElementById('premium');
    if (p) p.classList.remove('on');
    toggleDrawer(false);
  }
});

/* ═══ Global Error Handler ═══ */
window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Promise]', e.reason);
});

/* ═══ Auto-Init ═══ */
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  renderUserName();
  try { renderCard(); } catch(e) {}
  renderLessons();
  renderYears();
  loadExam();
  if (typeof window.loadAvatar === 'function') window.loadAvatar();
  if (typeof window.loadDream === 'function') window.loadDream();


});
function saveAttempt(year, subj) {
  const ta = document.getElementById(`attempt-${year}-${subj}`);
  const sol = document.getElementById(`solution-${year}-${subj}`);
  
  if (ta.value.trim() === '') {
    alert('الرجاء كتابة محاولتك أولاً قبل الحفظ والمقارنة.');
    return;
  }
  
  localStorage.setItem(`bem-attempt-${year}-${subj}`, ta.value);
  
  sol.style.display = 'block';
  
  ta.readOnly = true;
  ta.style.border = '2px solid #10b981';
  ta.style.backgroundColor = '#fdfaf3';
  ta.style.color = '#064e3b';
  
  Sound.ok();
  
  // Scroll to solution
  sol.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
const API_URL = 'http://localhost:3000/api';

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
      if (user.xp) window.addXP(0, true); // We'll need a better way to set absolute XP, but for now it's ok
      // For now, let's just update the UI directly if we have to
      document.getElementById('acc-xp').textContent = user.xp;
      
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

window.addPoints = function(amount, reason) {
    window.userCoins += amount;
    localStorage.setItem('eco_user_coins_v2', window.userCoins);
    const coinsEl = document.getElementById('ui-coins');
    if (coinsEl) coinsEl.textContent = window.userCoins;
    
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
  
  // Award Coins
  window.userCoins += q.coinsReward;
  const coinsEl = document.getElementById('ui-coins');
  if (coinsEl) coinsEl.textContent = window.userCoins;
  
  toast(`مهمة منجزة! حصلت على ${q.xpReward} XP و ${q.coinsReward} عملات ذهبية`, 'ok');
  Sound.ok();
  
  // Save coins to DB
  window.saveToDB({ coins: window.userCoins });
  
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
        // Fallback to realistic mock data if offline
        const mockNames = ['أحمد ب.', 'سارة ع.', 'محمد ق.', 'إيناس م.', 'عبدالرؤوف', 'ملاك', 'ريان', 'ياسين', 'فاطمة', 'أمينة', 'وليد'];
        let startXP = 25000;
        for(let i=0; i<10; i++) {
            data.push({
                name: mockNames[i % mockNames.length],
                xp: startXP - (Math.floor(Math.random() * 2000)),
                avatar_url: ''
            });
            startXP -= 2000;
        }
        
        // Add current user
        const myName = document.getElementById('account-name')?.textContent || 'أنا';
        const myXp = window.userXP || 0;
        const myAvatar = localStorage.getItem('eco_user_avatar') || '';
        data.push({ name: myName, xp: myXp, avatar_url: myAvatar });
        
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
            if (myName && user.name === myName) {
                rowClass += ' me';
            }
            
            const div = document.createElement('div');
            div.className = rowClass;
            
            // Generate avatar if not present
            let avatarHtml = `<span class="rank-num">${index + 1}</span>`;
            if (user.avatar_url && user.avatar_url.trim() !== '') {
                avatarHtml = `<div style="display:flex;align-items:center;gap:10px;">
                                <span class="rank-num">${index + 1}</span>
                                <div style="width:30px;height:30px;border-radius:50%;background:url('${user.avatar_url}') center/cover;border:1px solid rgba(255,255,255,0.2)"></div>
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


// ═══════════════ BEM ANNALS LOGIC ═══════════════
function renderAnnalsSubjects() {
  const listEl = document.getElementById('annals-subject-list');
  if (!listEl) return;
  
  listEl.innerHTML = '';
  
  if (typeof annalsData === 'undefined') {
    listEl.innerHTML = '<div style="color:var(--text-muted);grid-column:1/-1;">لم يتم العثور على بيانات الحوليات. تأكد من تحميل annalsData.js</div>';
    
    return;
  }
  
  const subjects = Object.keys(annalsData);
  if (subjects.length === 0) {
    listEl.innerHTML = '<div style="color:var(--text-muted);grid-column:1/-1;">لا توجد حوليات متوفرة حالياً.</div>';
  } else {
    subjects.forEach(sub => {
      // Find the first year to use as default or create a sub-menu later
      // For now, if clicking a subject, just open the first year available
      const years = Object.keys(annalsData[sub]).sort((a,b)=>b.localeCompare(a)); // newest first
      const defaultYear = years[0];
      
      const div = document.createElement('div');
      div.className = 'tile';
      div.style.textAlign = 'center';
      div.style.padding = '15px';
      
      // Determine color based on subject (simple hash or mapping)
      let color = '#fbbf24';
      if(sub.includes('رياضيات') || sub.includes('فيزياء')) color = '#38bdf8';
      if(sub.includes('عربية') || sub.includes('إسلامية')) color = '#10b981';
      if(sub.includes('تاريخ')) color = '#a855f7';
      if(sub.includes('فرنسية') || sub.includes('إنجليزية')) color = '#f43f5e';
      
      div.innerHTML = `
        <div class="tile-icon" style="background:${color}20;color:${color};margin:0 auto 10px;">
          <i class="fa-solid fa-book"></i>
        </div>
        <h4 style="margin:0;font-size:1rem;">${sub}</h4>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:5px;">${years.length} مواضيع متوفرة</div>
      `;
      div.onclick = () => openAnnalsViewer(sub, defaultYear);
      listEl.appendChild(div);
    });
  }
  
  
}

function openAnnalsViewer(subject, year) {
  const viewerTitle = document.getElementById('annals-viewer-title');
  const bentoArea = document.getElementById('bento-content-area');
  
  if (!annalsData || !annalsData[subject] || !annalsData[subject][year]) {
      bentoArea.innerHTML = "<p style='text-align:center;padding:20px;'>عذراً، هذا الموضوع غير متوفر حالياً.</p>";
      return;
  }
  
  const data = annalsData[subject][year];
  // Convert spaces and fix paths for the iframe
  const questionPath = data.question;
  const answerPath = data.answer || data.question; // Fallback if no answer
  
  // Build a dropdown for years if multiple years exist
  const availableYears = Object.keys(annalsData[subject]);
  let titleHtml = `حوليات ${subject}`;
  if (availableYears.length > 1) {
    let savedYears = JSON.parse('{}');
    let options = availableYears.map(y => {
      return { key: y, display: savedYears[`${subject}_${y}`] || y.replace('_', ' ') };
    });
    
    let uniqueOptions = [];
    let seen = new Set();
    options.forEach(opt => {
      if (!seen.has(opt.display)) {
        seen.add(opt.display);
        uniqueOptions.push(opt);
      }
    });
    uniqueOptions.sort((a, b) => b.display.localeCompare(a.display));

    titleHtml += ` <select onchange="openAnnalsViewer('${subject}', this.value)" style="margin-right:10px;padding:4px;border-radius:4px;background:#fff;color:#000;border:1px solid #ccc;font-weight:bold;cursor:pointer;">`;
    uniqueOptions.forEach(opt => {
      titleHtml += `<option value="${opt.key}" ${opt.key === year ? 'selected' : ''}>${opt.display}</option>`;
    });
    titleHtml += `</select>`;
  } else {
    titleHtml += ` - ${year}`;
  }
  viewerTitle.innerHTML = titleHtml;
  
  // Build Bento UI
  bentoArea.innerHTML = `
        <!-- عرض ملف السؤال -->
        <section class="bento-card pdf-card" style="margin-bottom: 20px;">
            <h2 id="examTitle">نص الموضوع 📄</h2>
            <iframe id="questionIframe" src="${questionPath}#toolbar=0" width="100%" height="500px" style="border: 2px solid #eee; border-radius: 12px;"></iframe>
        </section>

        <!-- مساحة المحاولة -->
        <section class="bento-card attempt-card" style="margin-bottom: 20px;">
            <h2>مساحة المحاولة ✍️</h2>
            <p>اكتب إجابتك هنا لتتمكن من رؤية الحل النموذجي.</p>
            
            <textarea id="studentAttempt" class="bento-textarea" rows="6" placeholder="ابدأ بكتابة إجابتك هنا..."></textarea>
            
            <div class="bento-actions">
                <button id="uploadBtn" class="bento-btn bento-secondary" onclick="alert('سيتم ربط هذا الزر لاحقاً لرفع صورة من الهاتف أو الحاسوب.')">📷 إرفاق صورة لمحاولتي</button>
                <button id="showAnswerBtn" class="bento-btn bento-primary" disabled style="background-color:#cccccc;">🔒 عرض الإجابة النموذجية</button>
            </div>
        </section>

        <!-- عرض ملف الإجابة النموذجية -->
        <section id="answerSection" class="bento-card pdf-card bento-hidden">
            <h2>الإجابة النموذجية وسلم التنقيط 🎯</h2>
            <iframe id="answerIframe" src="${answerPath}#toolbar=0" width="100%" height="600px" style="border: 2px solid #eee; border-radius: 12px;"></iframe>
            
            <div class="self-evaluation">
                <h3 style="width: 100%; text-align: center; margin-bottom: 10px;">قيم محاولتك:</h3>
                <button class="eval-btn success" onclick="alert('أحسنت! تمت إضافة 100 نقطة.')">صحيحة كلياً (+100 نقطة)</button>
                <button class="eval-btn warning" onclick="alert('محاولة جيدة! تمت إضافة 50 نقطة.')">صحيحة جزئياً (+50 نقطة)</button>
                <button class="eval-btn danger" onclick="alert('لا بأس، الخطأ جزء من التعلم. (+10 نقاط)')">خاطئة (+10 نقاط)</button>
            </div>
        </section>
  `;
  
  // Attach event listeners for the newly injected HTML
  const attemptText = document.getElementById("studentAttempt");
  const showAnswerBtn = document.getElementById("showAnswerBtn");
  const answerSection = document.getElementById("answerSection");

  attemptText.addEventListener("input", () => {
      if (attemptText.value.trim().length >= 5) {
          showAnswerBtn.disabled = false;
          showAnswerBtn.innerHTML = "👁️ عرض الإجابة النموذجية";
          showAnswerBtn.style.backgroundColor = "#4CAF50"; 
      } else {
          showAnswerBtn.disabled = true;
          showAnswerBtn.innerHTML = "🔒 عرض الإجابة النموذجية";
          showAnswerBtn.style.backgroundColor = "#cccccc"; 
      }
  });

  showAnswerBtn.addEventListener("click", () => {
      answerSection.classList.remove("bento-hidden");
      setTimeout(() => { answerSection.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
      
      showAnswerBtn.innerHTML = "✅ تم كشف الإجابة";
      showAnswerBtn.disabled = true;
      showAnswerBtn.style.backgroundColor = "#2E7D32";
  });
  
  openOverlay('annals-viewer');
}

function showAnnalsSolution() {
  const attemptArea = document.getElementById('annals-attempt-area');
  if (attemptArea.value.trim().length < 5) {
    alert('يرجى المحاولة وكتابة إجابتك (أو بعض النقاط الرئيسية) قبل عرض الحل النموذجي!');
    attemptArea.focus();
    return;
  }
  
  document.getElementById('annals-solution-images').style.display = 'block';
  document.getElementById('annals-show-solution-btn').style.display = 'none';
  
  // Scroll to solution
  setTimeout(() => {
    document.getElementById('annals-solution-images').scrollIntoView({behavior: 'smooth'});
  }, 100);
}

function closeAnnalsViewer() {
  closeOverlay('annals-viewer');
}

window.openAnnalsViewer = openAnnalsViewer;

window.editYear = function(subject, yearId) {
    let saved = JSON.parse('{}' || '{}');
    let current = saved[`${subject}_${yearId}`] || yearId.replace('_', ' ');
    let newYear = prompt("أدخل السنة الصحيحة لهذا الامتحان (مثلاً: 2024):", current);
    if (newYear && newYear.trim() !== '') {
        saved[`${subject}_${yearId}`] = newYear.trim();
        localStorage.setItem('customYears', JSON.stringify(saved));
        openAnnalsViewer(subject, yearId); // Refresh view
    }
};

window.adjustSplit = function(subject, yearId, delta) {
    const data = annalsData[subject][yearId];
    let customSplits = JSON.parse(localStorage.getItem('customSplits') || '{}');
    let currentSplit = customSplits[`${subject}_${yearId}`] !== undefined ? customSplits[`${subject}_${yearId}`] : data.split_idx;
    currentSplit += delta;
    if (currentSplit < 1) currentSplit = 1;
    if (currentSplit > data.pages.length) currentSplit = data.pages.length;
    customSplits[`${subject}_${yearId}`] = currentSplit;
    localStorage.setItem('customSplits', JSON.stringify(customSplits));
    openAnnalsViewer(subject, yearId);
};


/* ═══ Custom Select Dropdown UI ═══ */
function initCustomSelects() {
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        if (select.dataset.customized) return;
        select.dataset.customized = true;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        if (select.style.width) wrapper.style.width = select.style.width;
        if (select.style.marginBottom) wrapper.style.marginBottom = select.style.marginBottom;
        
        const customSelect = document.createElement('div');
        customSelect.className = 'custom-select';
        
        const optionsList = document.createElement('div');
        optionsList.className = 'custom-options';
        
        let selectedOption = select.options[select.selectedIndex];
        customSelect.innerHTML = selectedOption ? selectedOption.text : 'اختر المادة';
        
        Array.from(select.options).forEach((option, index) => {
            const optDiv = document.createElement('div');
            optDiv.className = 'custom-option';
            if (index === select.selectedIndex) optDiv.classList.add('selected');
            optDiv.textContent = option.text;
            
            optDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                select.selectedIndex = index;
                customSelect.innerHTML = option.text;
                
                optionsList.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
                optDiv.classList.add('selected');
                
                optionsList.classList.remove('open');
                customSelect.classList.remove('open');
            });
            optionsList.appendChild(optDiv);
        });
        
        customSelect.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-options').forEach(el => {
                if(el !== optionsList) el.classList.remove('open');
            });
            document.querySelectorAll('.custom-select').forEach(el => {
                if(el !== customSelect) el.classList.remove('open');
            });
            optionsList.classList.toggle('open');
            customSelect.classList.toggle('open');
        });
        
        select.style.display = 'none';
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(customSelect);
        wrapper.appendChild(optionsList);
        wrapper.appendChild(select);
    });
    
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-options').forEach(el => el.classList.remove('open'));
        document.querySelectorAll('.custom-select').forEach(el => el.classList.remove('open'));
    });
}



// -----------------------------------------
// Zen Space - Audio & Chat (Companion Space)
// -----------------------------------------

const zenAudio = document.getElementById('zen-audio');
const zenAudioSources = {
    rain: ['./assets/light_rain_0.mp3'],
    forest: ['./assets/birds_0.mp3', './assets/birds_1.mp3', './assets/birds_2.mp3']
};

let currentZenType = null;

function playZenSound(type) {
    let audioEl = document.getElementById('zen-audio');
    if(!audioEl) {
        alert("لم يتم العثور على مشغل الصوت.");
        return;
    }
    
    if (type === 'stop') {
        audioEl.pause();
        audioEl.currentTime = 0;
        currentZenType = null;
        audioEl.onended = null;
        return;
    }

    if (zenAudioSources[type]) {
        currentZenType = type;
        
        // Pick a random track from the array
        let tracks = zenAudioSources[type];
        let randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
        
        audioEl.src = randomTrack;
        audioEl.volume = 1.0;
        audioEl.loop = false; // We handle looping manually to vary the tracks
        
        // When track ends, play another random track of the same type
        audioEl.onended = () => {
            if (currentZenType) {
                playZenSound(currentZenType);
            }
        };
        
        let playPromise = audioEl.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.log('Audio play failed:', e);
                alert('تعذر تشغيل الصوت. متصفحك قد يحظر التشغيل التلقائي أو لا يدعم صيغة الملف.');
            });
        }
    }
}

// Zen AI Chat
const zenChatHistory = [
    { role: 'system', content: 'أنت مرشد نفسي ودراسي لطيف جداً لتلاميذ شهادة التعليم المتوسط (BEM) في الجزائر. اسمك "رفيقي". هدفك تشجيع التلميذ، تخفيف توتره، وإعطاؤه نصائح دراسية ونفسية قصيرة وعملية. استخدم إيموجيز لطيفة وتحدث بلغة مبسطة قريبة للقلب.' }
];

async function sendZenMessage() {
    const input = document.getElementById('zen-chat-input');
    const box = document.getElementById('zen-chat-box');
    const text = input.value.trim();
    if(!text) return;

    // Add user message to UI
    const userMsg = document.createElement('div');
    userMsg.style.cssText = 'background:var(--primary); color:white; padding:12px 18px; border-radius:12px; border-bottom-right-radius:2px; align-self:flex-start; max-width:85%; line-height:1.6; margin:5px 0; box-shadow:0 2px 5px rgba(0,0,0,0.1); font-weight:500;';
    userMsg.textContent = text;
    box.appendChild(userMsg);
    input.value = '';
    box.scrollTop = box.scrollHeight;

    zenChatHistory.push({ role: 'user', content: text });

    // Show loading bubble
    const loadingMsg = document.createElement('div');
    loadingMsg.style.cssText = 'background:rgba(139, 92, 246, 0.1); padding:12px 18px; border-radius:12px; border-bottom-left-radius:2px; align-self:flex-end; max-width:85%; color:var(--text-muted); font-style:italic; margin:5px 0;';
    loadingMsg.textContent = 'جاري التفكير...';
    box.appendChild(loadingMsg);
    box.scrollTop = box.scrollHeight;

    // Fetch from Backend
    
    try {
        const token = localStorage.getItem('eco_token');
        const response = await fetch(API_URL + '/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ messages: zenChatHistory })
        });

        const data = await response.json();
        box.removeChild(loadingMsg);

        if (!response.ok) {
            throw new Error(data.error || 'Backend API error or unauthorized');
        }

        const reply = data.choices[0].message.content;
        zenChatHistory.push({ role: 'assistant', content: reply });

        const aiMsg = document.createElement('div');
        aiMsg.style.cssText = 'background:rgba(139, 92, 246, 0.1); padding:12px 18px; border-radius:12px; border-bottom-left-radius:2px; align-self:flex-end; max-width:85%; color:var(--text); line-height:1.6; margin:5px 0;';
        
        if(window.marked) {
            aiMsg.innerHTML = marked.parse(reply);
        } else {
            let htmlText = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            htmlText = htmlText.replace(/\*(.*?)\*/g, '<em>$1</em>');
            htmlText = htmlText.replace(/\n/g, '<br>');
            aiMsg.innerHTML = htmlText;
        }

        box.appendChild(aiMsg);
        box.scrollTop = box.scrollHeight;

    } catch (err) {
        box.removeChild(loadingMsg);
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = 'background:rgba(239, 68, 68, 0.1); color:#ef4444; padding:10px 15px; border-radius:12px; align-self:center; max-width:90%; text-align:center; font-size:0.9em;';
        errorMsg.textContent = 'حدث خطأ في الاتصال بالمرشد. تأكد من الإنترنت أو مفتاح API.';
        box.appendChild(errorMsg);
        box.scrollTop = box.scrollHeight;
    }
}

// Zen Tabs Logic
function openZenTab(tabId, btnElement) {
  document.querySelectorAll('.zen-tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.zen-tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  btnElement.classList.add('active');
}

function enableCropMode(btn) {
  const container = btn.parentElement.parentElement;
  const imgs = container.querySelectorAll('img');
  if (imgs.length === 0) return;
  const lastImg = imgs[imgs.length - 1];
  
  btn.innerHTML = '<i class="fa-solid fa-hand-pointer"></i> انقر على الصورة لتحديد مكان القص...';
  btn.style.background = '#f59e0b';
  
  lastImg.style.cursor = 'crosshair';
  lastImg.style.border = '2px dashed #f59e0b';
  
  const clickHandler = function(e) {
    const rect = lastImg.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = (y / rect.height) * 100;
    
    const overlayTitle = document.getElementById('ov-annals-title').innerText;
    const parts = overlayTitle.split(' - ');
    const subject = parts[0].replace('حولية ', '').trim();
    const year = parts[1].trim();
    
    let crops = JSON.parse(localStorage.getItem('imageCrops') || '{}');
    const key = `${subject}_${year}_img_${imgs.length - 1}`;
    crops[key] = percentage;
    localStorage.setItem('imageCrops', JSON.stringify(crops));
    
    lastImg.style.cursor = 'default';
    lastImg.style.border = 'none';
    lastImg.removeEventListener('click', clickHandler);
    
    openOverlay(subject, year);
  };
  
  lastImg.addEventListener('click', clickHandler);
}

// --- Bento UI Logic ---
function loadBentoExam() {
    const subject = document.getElementById('bentoSubjectSelect').value;
    const year = document.getElementById('bentoYearSelect').value;
    
    if (!subject || !year) {
        alert('يرجى اختيار المادة والسنة أولا.');
        return;
    }
    
    const contentArea = document.getElementById('bentoContentArea');
    const examTitle = document.getElementById('bentoExamTitle');
    const questionIframe = document.getElementById('bentoQuestionIframe');
    const answerIframe = document.getElementById('bentoAnswerIframe');
    const answerSection = document.getElementById('bentoAnswerSection');
    const attemptText = document.getElementById('bentoStudentAttempt');
    const showAnswerBtn = document.getElementById('bentoShowAnswerBtn');
    
    // reset state
    attemptText.value = '';
    showAnswerBtn.disabled = true;
    showAnswerBtn.innerHTML = "👁️ كشف الإجابة النموذجية";
    showAnswerBtn.style.backgroundColor = "#cccccc";
    answerSection.style.display = 'none';
    
    // Dynamically construct paths
    const questionPath = `بنك_منظم/${subject}/${subject}_${year}_Question.pdf`;
    const answerPath = `بنك_منظم/${subject}/${subject}_${year}_Answer.pdf`;
    
    examTitle.innerHTML = `نص الموضوع 📜 - ${subject} ${year}`;
    questionIframe.src = questionPath + "#toolbar=0";
    answerIframe.src = answerPath + "#toolbar=0";
    
    contentArea.style.display = 'flex';
    
    // Listeners for attempt
    attemptText.oninput = function() {
        if (attemptText.value.trim().length >= 5) {
            showAnswerBtn.disabled = false;
            showAnswerBtn.style.backgroundColor = "#4CAF50"; 
        } else {
            showAnswerBtn.disabled = true;
            showAnswerBtn.style.backgroundColor = "#cccccc"; 
        }
    };
    
    showAnswerBtn.onclick = function() {
        answerSection.style.display = 'block';
        setTimeout(() => { answerSection.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
        showAnswerBtn.innerHTML = "✅ تم كشف الإجابة";
        showAnswerBtn.disabled = true;
        showAnswerBtn.style.backgroundColor = "#2E7D32";
    };
}

async function evaluateBentoAttempt() {
    const attemptText = document.getElementById('bentoStudentAttempt').value;
    const subjectSelect = document.getElementById('bentoSubjectSelect');
    const yearSelect = document.getElementById('bentoYearSelect');
    
    if (subjectSelect.selectedIndex <= 0 || !yearSelect.value) {
        alert('الرجاء اختيار المادة والسنة أولا.');
        return;
    }

    const subject = subjectSelect.options[subjectSelect.selectedIndex].text;
    const year = yearSelect.value;

    if (!attemptText || attemptText.trim().length < 10) {
        alert('الرجاء كتابة محاولة جادة قبل طلب التقييم (10 حروف على الأقل).');
        return;
    }

    const btn = document.getElementById('bentoAiEvalBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ جاري التقييم بالذكاء الاصطناعي...';
    btn.disabled = true;
    btn.style.backgroundColor = '#cbd5e1';

    try {
        const response = await fetch(API_URL + '/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: `أنت معلم جزائري خبير في تقييم امتحانات شهادة التعليم المتوسط (BEM). المادة: ${subject}، السنة: ${year}. قم بتقييم محاولة التلميذ بناءً على الحل النموذجي المتعارف عليه. أعط ملاحظات مشجعة، وحدد الأخطاء بلطف مع تقديم تلميحات. تنسيق الرد: استخدم **للنصوص المهمة** ولا تستخدم markdown معقد آخر.` },
                    { role: 'user', content: `محاولتي لحل موضوع ${subject} لعام ${year} هي:\n\n${attemptText}\n\nما هو تقييمك؟` }
                ]
            })
        });

        const data = await response.json();
        
        let feedbackDiv = document.getElementById('bentoAiFeedback');
        if (!feedbackDiv) {
            feedbackDiv = document.createElement('div');
            feedbackDiv.id = 'bentoAiFeedback';
            feedbackDiv.style.marginTop = '20px';
            feedbackDiv.style.padding = '20px';
            feedbackDiv.style.backgroundColor = '#f0fdf4';
            feedbackDiv.style.borderRight = '4px solid #22c55e';
            feedbackDiv.style.borderRadius = '12px';
            feedbackDiv.style.lineHeight = '1.6';
            
            const btnGroup = btn.parentElement;
            btnGroup.parentElement.appendChild(feedbackDiv);
        }

        const replyText = data.choices && data.choices.length > 0 ? data.choices[0].message.content : null;

        if (replyText) {
            let htmlReply = replyText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            htmlReply = htmlReply.replace(/\n/g, '<br>');
            feedbackDiv.innerHTML = `<div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; border-bottom:1px solid #dcfce3; padding-bottom:10px;">
                <span style="font-size:1.5rem;">🤖</span>
                <h3 style="margin:0; color:#166534;">تقييم المعلم الذكي</h3>
            </div>
            <div style="color:#15803d; font-size:1.1rem;">${htmlReply}</div>`;
            
            const showAnswerBtn = document.getElementById('bentoShowAnswerBtn');
            showAnswerBtn.disabled = false;
            showAnswerBtn.style.backgroundColor = "#4CAF50"; 
            
        } else {
            feedbackDiv.innerHTML = '<span style="color:red;">عذراً، حدث خطأ أثناء التقييم. حاول مرة أخرى.</span>';
        }
    } catch (e) {
        alert('خطأ في الاتصال بالخادم. تأكد من اتصالك بالإنترنت وأن الخادم يعمل.');
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
    btn.style.backgroundColor = '#f1f5f9';
}

window.handleSelfEval = function(btn, points, msg) {
  if (typeof addPoints === 'function') addPoints(points, msg);
  // Disable all buttons in the same container
  const container = btn.parentElement;
  const buttons = container.querySelectorAll('button');
  buttons.forEach(b => {
    b.disabled = true;
    b.style.opacity = '0.5';
    b.style.cursor = 'not-allowed';
  });
  // Highlight the clicked one slightly
  btn.style.opacity = '1';
  btn.style.border = '2px solid black';
};

/* --- SOUND EFFECTS SYSTEM --- */
let audioCtx = null;

window.playSound = function(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'success' || type === 'ok') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'error' || type === 'err') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'info') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.05, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch(e) {}
};

/* --- PWA INSTALLATION SYSTEM --- */
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'flex';
});

window.installPWA = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      const btn = document.getElementById('pwa-install-btn');
      if (btn) btn.style.display = 'none';
    }
    deferredPrompt = null;
  }
};
