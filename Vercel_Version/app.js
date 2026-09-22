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
    try { localStorage.removeItem('eco-theme'); } catch(e) {}
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
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:var(--surface);padding:2px 6px;border-radius:4px">$1</code>')
      .replace(/\\n/g, '<br>');
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
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: this.history })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Network response was not ok');
      }
      const data = await response.json();
      reply = data.choices[0].message.content;
      this.history.push({ role: 'assistant', content: reply });
    } catch (error) {
      console.error('Error calling backend:', error);
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
  "ar": {
    "2022": {
      "title": "دورة جوان 2022 — اللغة العربية",
      "paper": "<div class=\"exam-section\">\n  <h3>النص:</h3>\n  <p style=\"text-align:justify;line-height:1.8\">اجتاحت وسائل التواصل الاجتماعي عالمنا المعاصر، فأصبحت جزءاً لا يتجزأ من يومياتنا. لقد قرّبت المسافات وجعلت العالم قرية صغيرة، لكنها في المقابل باعدت بين أفراد الأسرة الواحدة.<br><br>إن الإفراط في استخدام هذه الوسائل قد يؤدي إلى العزلة النفسية وتشتت الانتباه. لذا، يجب علينا أن نكون واعين في استخدامها، فنأخذ منها ما ينفعنا في دراستنا وتطوير ذواتنا، ونبتعد عن مضيعات الوقت والجهد.</p>\n  <div class=\"exam-part\" style=\"margin-top:20px\">\n    <h3>الأسئلة:</h3>\n    <h4>الجزء الأول: البناء الفكري (06 نقاط)</h4>\n    <ol>\n      <li>لوسائل التواصل الاجتماعي إيجابيات وسلبيات. اذكر واحدة من كليهما من النص.</li>\n      <li>هات عنواناً مناسباً للنص.</li>\n      <li>هات ضد الكلمتين: الإفراط، العزلة.</li>\n    </ol>\n    <h4>البناء اللغوي والفني (06 نقاط)</h4>\n    <ol>\n      <li>أعرب الكلمات: جزءاً، وسائل.</li>\n      <li>ما النمط الغالب على النص؟ اذكر مؤشراً واحداً.</li>\n      <li>استخرج طباقاً وبين نوعه وأثره في المعنى.</li>\n    </ol>\n    <h4>الجزء الثاني: الوضعية الإدماجية (08 نقاط)</h4>\n    <p>التعليمة: اكتب فقرة (10 إلى 12 سطراً) تنصح فيها زملائك بالاستخدام العقلاني للهواتف الذكية، موظفاً الحجاج ومحترماً علامات الترقيم.</p>\n  </div>\n  \n  <div class=\"exam-solution-box\" style=\"margin-top:20px;padding-top:20px;border-top:1px dashed var(--border)\">\n    <div class=\"student-attempt\" style=\"margin-bottom:15px\">\n      <h4 style=\"margin-bottom:10px;color:#10b981\"><i class=\"fa-solid fa-pen-nib\"></i> مساحة المحاولة:</h4>\n      <textarea id=\"attempt-2022-ar\" placeholder=\"اكتب محاولتك وإجاباتك هنا قبل الاطلاع على التصحيح الرسمي...\" style=\"width:100%;height:150px;background:#ffffff;border:1px solid #10b981;border-radius:var(--r-md);padding:15px;color:#1a1410;font-family:inherit;resize:vertical;font-size:0.95rem\"></textarea>\n      <button class=\"btn btn-mint\" onclick=\"saveAttempt('2022', 'ar')\" style=\"margin-top:10px;width:100%;justify-content:center;padding:12px;font-size:1rem\">\n        <i class=\"fa-solid fa-save\"></i> حفظ المحاولة والمقارنة مع التصحيح\n      </button>\n    </div>\n    <div id=\"solution-2022-ar\" class=\"exam-solution\" style=\"display:none;background:#f0fdf4;color:#166534;padding:20px;border-radius:var(--r-md);margin-top:10px;border:1px solid #bbf7d0\">\n      \n      <h4>التصحيح النموذجي:</h4>\n      <p><strong>البناء الفكري:</strong><br>1- الإيجابيات: تقريب المسافات. السلبيات: المباعدة بين أفراد الأسرة، العزلة النفسية (2ن).<br>2- العنوان: سلاح ذو حدين، أو آثار شبكات التواصل (2ن).</p>\n      <p><strong>البناء اللغوي:</strong><br>1- الإعراب: جزءاً (خبر أصبح منصوب). وسائل (مضاف إليه مجرور) (2ن).<br>2- النمط: تفسيري حجاجي (2ن).<br>3- الطباق: قرّبت ≠ باعدت (طباق إيجاب). أثره: توضيح المعنى وتأكيده بالضد (2ن).</p>\n    </div>\n  \n    </div>\n  </div>\n</div>"
    },
    "2023": {
      "title": "دورة جوان 2023 — اللغة العربية",
      "paper": "<div class=\"exam-section\">\n  <h3>النص:</h3>\n  <p style=\"text-align:justify;line-height:1.8\">إن التكافل الاجتماعي في أوقات المحن والكوارث ليس مجرد خيار تفرضه الظروف، بل هو ضرورة حتمية تنبع من قيمنا الإسلامية والإنسانية. عندما تضرب النوازل مجتمعاً ما، تظهر المعادن الحقيقية للأفراد، فيهبّ القوي لمساعدة الضعيف، ويجود الغني بماله للفقير.<br><br>لقد أثبت الجزائريون، عبر محطات تاريخية عديدة، أنهم جسد واحد؛ فكم من أزمة خانقة تحولت بفضل التضامن إلى ملحمة تلاحم أذهلت العالم. إن هذا التآزر هو الجدار المنيع الذي تتحطم عليه كل الصعاب، وهو النور الذي يبدد ظلمات اليأس في قلوب المتضررين.</p>\n  <div class=\"exam-part\" style=\"margin-top:20px\">\n    <h3>الأسئلة:</h3>\n    <h4>الجزء الأول: البناء الفكري (06 نقاط)</h4>\n    <ol>\n      <li>هات فكرة عامة مناسبة للنص.</li>\n      <li>كيف يرى الكاتب التكافل الاجتماعي في أوقات المحن؟</li>\n      <li>اشرح الكلمتين الآتيتين: النوازل، التآزر.</li>\n    </ol>\n    <h4>البناء اللغوي والفني (06 نقاط)</h4>\n    <ol>\n      <li>أعرب ما تحته خط في النص (مساعدة، الجزائريون).</li>\n      <li>استخرج من النص عطف نسق وبين معناه.</li>\n      <li>في العبارة \"التآزر هو الجدار المنيع\" صورة بيانية، سمها واشرحها.</li>\n    </ol>\n    <h4>الجزء الثاني: الوضعية الإدماجية (08 نقاط)</h4>\n    <p>السياق: شهدت إحدى المناطق المجاورة كارثة طبيعية (فيضانات/حرائق)، فتأثرت عائلات كثيرة.<br>التعليمة: اكتب نصاً من 12 سطراً تسرد فيه وقائع الهبة التضامنية التي شاركت فيها، وتصف شعورك، موظفاً استعارة ومحترماً علامات الوقف.</p>\n  </div>\n  \n  <div class=\"exam-solution-box\" style=\"margin-top:20px;padding-top:20px;border-top:1px dashed var(--border)\">\n    <div class=\"student-attempt\" style=\"margin-bottom:15px\">\n      <h4 style=\"margin-bottom:10px;color:#10b981\"><i class=\"fa-solid fa-pen-nib\"></i> مساحة المحاولة:</h4>\n      <textarea id=\"attempt-2023-ar\" placeholder=\"اكتب محاولتك وإجاباتك هنا قبل الاطلاع على التصحيح الرسمي...\" style=\"width:100%;height:150px;background:#ffffff;border:1px solid #10b981;border-radius:var(--r-md);padding:15px;color:#1a1410;font-family:inherit;resize:vertical;font-size:0.95rem\"></textarea>\n      <button class=\"btn btn-mint\" onclick=\"saveAttempt('2023', 'ar')\" style=\"margin-top:10px;width:100%;justify-content:center;padding:12px;font-size:1rem\">\n        <i class=\"fa-solid fa-save\"></i> حفظ المحاولة والمقارنة مع التصحيح\n      </button>\n    </div>\n    <div id=\"solution-2023-ar\" class=\"exam-solution\" style=\"display:none;background:#f0fdf4;color:#166534;padding:20px;border-radius:var(--r-md);margin-top:10px;border:1px solid #bbf7d0\">\n      \n      <h4>التصحيح النموذجي:</h4>\n      <p><strong>البناء الفكري:</strong><br>1- الفكرة العامة: إبراز أهمية التكافل الاجتماعي في تجاوز المحن وضرب المثال بتلاحم الجزائريين (2ن).<br>2- يراه ضرورة حتمية تنبع من القيم الإسلامية والإنسانية (2ن).<br>3- النوازل: المصائب/الكوارث. التآزر: التضامن/التعاون (2ن).</p>\n      <p><strong>البناء اللغوي:</strong><br>1- الإعراب: مساعدة (مضاف إليه مجرور). الجزائريون (فاعل مرفوع بالواو لأنه جمع مذكر سالم) (2ن).<br>2- عطف النسق: الواو (الجمع والاشتراك) أو الفاء (الترتيب والتعقيب) (2ن).<br>3- الصورة البيانية: تشبيه بليغ (شبه التآزر بالجدار وحذف الأداة ووجه الشبه) (2ن).</p>\n    </div>\n  \n    </div>\n  </div>\n</div>"
    },
    "2025": {
      "title": "دورة جوان 2025 — اللغة العربية",
      "paper": "<div class=\"exam-section\">\n  <h3>النص:</h3>\n  <p style=\"text-align:justify;line-height:1.8\">إن حب الوطن غريزة فطرية تسري في عروق الإنسان مجرى الدم. فالوطن ليس مجرد بقعة جغرافية نعيش عليها، بل هو الذاكرة التي تحمل أمجاد الآباء، والمستقبل الذي ننشده لأبنائنا.<br><br>لقد قدم أجدادنا تضحيات جساماً بالدماء والدموع لكي نعيش أحراراً. واليوم، إن واجبنا كشباب متعلم هو الدفاع عن هذا الوطن بالكلمة الصادقة، والعمل المخلص، والنجاح العلمي، لنرفع رايته عالية بين الأمم.</p>\n  <div class=\"exam-part\" style=\"margin-top:20px\">\n    <h3>الأسئلة:</h3>\n    <h4>الجزء الأول: البناء الفكري (06 نقاط)</h4>\n    <ol>\n      <li>بماذا شبّه الكاتب حب الوطن؟</li>\n      <li>كيف يمكن للشباب اليوم الدفاع عن وطنهم؟</li>\n      <li>لخّص مضمون النص في فكرة عامة.</li>\n    </ol>\n    <h4>البناء اللغوي والفني (06 نقاط)</h4>\n    <ol>\n      <li>أعرب ما تحته خط: غريزة، أحراراً.</li>\n      <li>حدد نمط النص الغالب.</li>\n      <li>استخرج سجعاً من الفقرة الثانية.</li>\n    </ol>\n    <h4>الجزء الثاني: الوضعية الإدماجية (08 نقاط)</h4>\n    <p>التعليمة: بمناسبة عيد الاستقلال، طلب منك أستاذك إلقاء كلمة توضح فيها لزملائك أهمية الاجتهاد في الدراسة لخدمة الوطن. اكتب فقرة من 12 سطراً معتمداً النمط التوجيهي.</p>\n  </div>\n  \n  <div class=\"exam-solution-box\" style=\"margin-top:20px;padding-top:20px;border-top:1px dashed var(--border)\">\n    <div class=\"student-attempt\" style=\"margin-bottom:15px\">\n      <h4 style=\"margin-bottom:10px;color:#10b981\"><i class=\"fa-solid fa-pen-nib\"></i> مساحة المحاولة:</h4>\n      <textarea id=\"attempt-2025-ar\" placeholder=\"اكتب محاولتك وإجاباتك هنا قبل الاطلاع على التصحيح الرسمي...\" style=\"width:100%;height:150px;background:#ffffff;border:1px solid #10b981;border-radius:var(--r-md);padding:15px;color:#1a1410;font-family:inherit;resize:vertical;font-size:0.95rem\"></textarea>\n      <button class=\"btn btn-mint\" onclick=\"saveAttempt('2025', 'ar')\" style=\"margin-top:10px;width:100%;justify-content:center;padding:12px;font-size:1rem\">\n        <i class=\"fa-solid fa-save\"></i> حفظ المحاولة والمقارنة مع التصحيح\n      </button>\n    </div>\n    <div id=\"solution-2025-ar\" class=\"exam-solution\" style=\"display:none;background:#f0fdf4;color:#166534;padding:20px;border-radius:var(--r-md);margin-top:10px;border:1px solid #bbf7d0\">\n      \n      <h4>التصحيح النموذجي:</h4>\n      <p><strong>البناء الفكري:</strong><br>1- شبهه بالغريزة الفطرية التي تسري مجرى الدم.<br>2- بالكلمة الصادقة والعمل المخلص والنجاح العلمي.<br>3- الفكرة العامة: بيان الكاتب لقيمة الوطن ودعوة الشباب للمساهمة في رقيه.</p>\n      <p><strong>البناء اللغوي والفني:</strong><br>1- الإعراب: غريزة (خبر إن مرفوع). أحراراً (حال منصوبة).<br>2- نمط النص: وصفي توجيهي.<br>3- السجع: الصادقة، المخلص (تقارب الحروف) أو توافق الفواصل.</p>\n    </div>\n  \n    </div>\n  </div>\n</div>"
    },
    "2026": {
      "title": "دورة 2026 — اللغة العربية (موضوع رسمي)",
      "paper": "\n<div class=\"exam-section\">\n  <div class=\"exam-part\">\n    <img src=\"./assets/exams/2026/arabic_exam_1.png\" style=\"width:100%; border-radius:8px; margin-bottom:15px; display:block; border: 1px solid var(--border);\" alt=\"صفحة 1\">\n<img src=\"./assets/exams/2026/arabic_exam_2.png\" style=\"width:100%; border-radius:8px; margin-bottom:15px; display:block; border: 1px solid var(--border);\" alt=\"صفحة 2\">\n\n  </div>\n  \n  <div class=\"exam-solution-box\" style=\"margin-top:20px;padding-top:20px;border-top:1px dashed var(--border)\">\n    <div class=\"student-attempt\" style=\"margin-bottom:15px\">\n      <h4 style=\"margin-bottom:10px;color:#10b981\"><i class=\"fa-solid fa-pen-nib\"></i> مساحة المحاولة:</h4>\n      <textarea id=\"attempt-2026-ar\" placeholder=\"اكتب إجابتك هنا قبل الاطلاع على التصحيح النموذجي...\" style=\"width:100%;height:150px;background:#ffffff;border:1px solid #10b981;border-radius:var(--r-md);padding:15px;color:#1a1410;font-family:inherit;resize:vertical;font-size:0.95rem\"></textarea>\n      <button class=\"btn btn-mint\" onclick=\"saveAttempt('2026', 'ar')\" style=\"margin-top:10px;width:100%;justify-content:center;padding:12px;font-size:1rem\">\n        <i class=\"fa-solid fa-save\"></i> حفظ المحاولة والمقارنة مع التصحيح\n      </button>\n    </div>\n    <div id=\"solution-2026-ar\" class=\"exam-solution\" style=\"display:none;background:#f0fdf4;color:#166534;padding:20px;border-radius:var(--r-md);margin-top:10px;border:1px solid #bbf7d0\">\n      <h4>التصحيح النموذجي:</h4>\n      <img src=\"./assets/exams/2026/arabic_sol_1.png\" style=\"width:100%; border-radius:8px; margin-bottom:15px; display:block; border: 1px solid var(--border);\" alt=\"صفحة 1\">\n<img src=\"./assets/exams/2026/arabic_sol_2.png\" style=\"width:100%; border-radius:8px; margin-bottom:15px; display:block; border: 1px solid var(--border);\" alt=\"صفحة 2\">\n<img src=\"./assets/exams/2026/arabic_sol_3.png\" style=\"width:100%; border-radius:8px; margin-bottom:15px; display:block; border: 1px solid var(--border);\" alt=\"صفحة 3\">\n\n    </div>\n  </div>\n</div>\n"
    }
  },
  "math": {
    "2022": {
      "title": "دورة جوان 2022 — الرياضيات",
      "paper": "<div class=\"exam-section\">\n  <div class=\"exam-part\">\n    <h3>الجزء الأول (12 نقطة)</h3>\n    <h4>التمرين الأول (03 نقاط):</h4>\n    <p>أوجد القاسم المشترك الأكبر للعددين $1053$ و $832$. ثم اكتب الكسر $\\frac{832}{1053}$ على شكل كسر غير قابل للاختزال.</p>\n    \n    <h4>التمرين الثاني (03 نقاط):</h4>\n    <p>لتكن العبارة $F = (3x - 5)^2 - 9$.<br>1- انشر ثم بسط العبارة $F$.<br>2- حلل $F$ إلى جداء عاملين.<br>3- حل المعادلة $(3x - 8)(3x - 2) = 0$.</p>\n    \n    <h4>التمرين الثالث (03 نقاط):</h4>\n    <p>إليك المراجراجحة الآتية: $4x - 5 \\leq 2x + 7$.<br>1- حل المتراجحة.<br>2- مثل مجموعة حلولها بيانياً.</p>\n  </div>\n  <div class=\"exam-part\">\n    <h3>الجزء الثاني (08 نقاط): الوضعية الإدماجية</h3>\n    <p>لدهن واجهة عمارة، استأجر مقاول رافعة كهربائية. تعتمد تكلفة الإيجار على عرضين:<br>العرض الأول: $2000 DA$ لليوم الواحد.<br>العرض الثاني: $1000 DA$ لليوم الواحد زائد اشتراك قدره $8000 DA$.</p>\n    <p>استعمل الدوال لحساب ابتداءً من أي عدد من الأيام يصبح العرض الثاني أفضل من العرض الأول.</p>\n  </div>\n  \n  <div class=\"exam-solution-box\" style=\"margin-top:20px;padding-top:20px;border-top:1px dashed var(--border)\">\n    <div class=\"student-attempt\" style=\"margin-bottom:15px\">\n      <h4 style=\"margin-bottom:10px;color:#10b981\"><i class=\"fa-solid fa-pen-nib\"></i> مساحة المحاولة:</h4>\n      <textarea id=\"attempt-2022-math\" placeholder=\"اكتب محاولتك وإجاباتك هنا قبل الاطلاع على التصحيح الرسمي...\" style=\"width:100%;height:150px;background:#ffffff;border:1px solid #10b981;border-radius:var(--r-md);padding:15px;color:#1a1410;font-family:inherit;resize:vertical;font-size:0.95rem\"></textarea>\n      <button class=\"btn btn-mint\" onclick=\"saveAttempt('2022', 'math')\" style=\"margin-top:10px;width:100%;justify-content:center;padding:12px;font-size:1rem\">\n        <i class=\"fa-solid fa-save\"></i> حفظ المحاولة والمقارنة مع التصحيح\n      </button>\n    </div>\n    <div id=\"solution-2022-math\" class=\"exam-solution\" style=\"display:none;background:#f0fdf4;color:#166534;padding:20px;border-radius:var(--r-md);margin-top:10px;border:1px solid #bbf7d0\">\n      \n      <h4>التصحيح النموذجي:</h4>\n      <p><strong>التمرين 1 (3ن):</strong><br>باستعمال القسمات الإقليدية: $PGCD(1053, 832) = 13$.<br>الاختزال: $\\frac{832}{1053} = \\frac{64}{81}$.</p>\n      <p><strong>التمرين 2 (3ن):</strong><br>التحليل: $F = (3x-5)^2 - 3^2 = (3x-5-3)(3x-5+3) = (3x-8)(3x-2)$.</p>\n      <p><strong>الوضعية (8ن):</strong><br>العرض 1: $f(x) = 2000x$<br>العرض 2: $g(x) = 1000x + 8000$<br>لإيجاد متى يكون العرض 2 أفضل: $g(x) < f(x) \\Rightarrow 1000x + 8000 < 2000x \\Rightarrow 1000x > 8000 \\Rightarrow x > 8$.<br>إذن ابتداءً من اليوم التاسع يصبح العرض الثاني أرخص.</p>\n    </div>\n  \n    </div>\n  </div>\n</div>"
    },
    "2023": {
      "title": "دورة جوان 2023 — الرياضيات",
      "paper": "<div class=\"exam-section\">\n  <div class=\"exam-part\">\n    <h3>الجزء الأول (12 نقطة)</h3>\n    <h4>التمرين الأول (03 نقاط):</h4>\n    <p>ليكن العددان الحقيقيان $A$ و $B$ حيث: $A = \\sqrt{80} + 2\\sqrt{125} - 3\\sqrt{20}$ و $B = \\frac{2 + \\sqrt{2}}{\\sqrt{2}}$.</p>\n    <ol>\n      <li>اكتب العدد $A$ على الشكل $a\\sqrt{5}$ حيث $a$ عدد طبيعي.</li>\n      <li>اكتب العدد $B$ على شكل نسبة مقامها عدد ناطق.</li>\n      <li>بيّن أن: $A \\times (B - 1) = 8\\sqrt{10}$.</li>\n    </ol>\n    \n    <h4>التمرين الثاني (03 نقاط):</h4>\n    <p>لتكن العبارة الجبرية $E$ حيث: $E = (2x - 3)^2 - (2x - 3)(x + 1)$.</p>\n    <ol>\n      <li>انشر وبسط العبارة $E$.</li>\n      <li>حلل العبارة $E$ إلى جداء عاملين من الدرجة الأولى.</li>\n      <li>حل المعادلة: $(2x - 3)(x - 4) = 0$.</li>\n    </ol>\n    \n    <h4>التمرين الثالث (03 نقاط):</h4>\n    <p>$ABC$ مثلث قائم في $A$. النقطة $M \\in [AB]$ والنقطة $N \\in [AC]$ حيث $(MN) \\parallel (BC)$.<br>الأطوال: $AM = 3cm$, $AB = 9cm$, $AN = 4cm$.</p>\n    <ol>\n      <li>احسب الطولين $AC$ و $MN$.</li>\n    </ol>\n    \n    <h4>التمرين الرابع (03 نقاط):</h4>\n    <p>في معلم متعامد ومتجانس، علّم النقط: $A(-1; 2)$، $B(3; -1)$، و $C(4; 6)$.</p>\n    <ol>\n      <li>احسب الطول $AB$.</li>\n      <li>إذا علمت أن $BC = \\sqrt{50}$ و $AC = \\sqrt{41}$، ما نوع المثلث $ABC$؟</li>\n    </ol>\n  </div>\n  <div class=\"exam-part\">\n    <h3>الجزء الثاني (08 نقاط): الوضعية الإدماجية</h3>\n    <p>يملك فلاح قطعة أرض مستطيلة الشكل مساحتها $2400 m^2$ وعرضها يساوي ثلثي ($2/3$) طولها.</p>\n    <p><strong>الجزء 1:</strong> احسب طول وعرض هذه القطعة.</p>\n    <p><strong>الجزء 2:</strong> أراد الفلاح إحاطتها بسياج مع ترك باب عرضه $4m$. ثمن المتر الواحد من السياج هو $150 DA$. احسب كلفة السياج.</p>\n  </div>\n  \n  <div class=\"exam-solution-box\" style=\"margin-top:20px;padding-top:20px;border-top:1px dashed var(--border)\">\n    <div class=\"student-attempt\" style=\"margin-bottom:15px\">\n      <h4 style=\"margin-bottom:10px;color:#10b981\"><i class=\"fa-solid fa-pen-nib\"></i> مساحة المحاولة:</h4>\n      <textarea id=\"attempt-2023-math\" placeholder=\"اكتب محاولتك وإجاباتك هنا قبل الاطلاع على التصحيح الرسمي...\" style=\"width:100%;height:150px;background:#ffffff;border:1px solid #10b981;border-radius:var(--r-md);padding:15px;color:#1a1410;font-family:inherit;resize:vertical;font-size:0.95rem\"></textarea>\n      <button class=\"btn btn-mint\" onclick=\"saveAttempt('2023', 'math')\" style=\"margin-top:10px;width:100%;justify-content:center;padding:12px;font-size:1rem\">\n        <i class=\"fa-solid fa-save\"></i> حفظ المحاولة والمقارنة مع التصحيح\n      </button>\n    </div>\n    <div id=\"solution-2023-math\" class=\"exam-solution\" style=\"display:none;background:#f0fdf4;color:#166534;padding:20px;border-radius:var(--r-md);margin-top:10px;border:1px solid #bbf7d0\">\n      \n      <h4>التصحيح النموذجي:</h4>\n      <p><strong>التمرين 1 (3ن):</strong><br>1- $A = 4\\sqrt{5} + 10\\sqrt{5} - 6\\sqrt{5} = 8\\sqrt{5}$ (1ن).<br>2- $B = \\frac{(2+\\sqrt{2})\\sqrt{2}}{\\sqrt{2}\\times\\sqrt{2}} = \\frac{2\\sqrt{2}+2}{2} = \\sqrt{2}+1$ (1ن).<br>3- الإثبات: $8\\sqrt{5} \\times (\\sqrt{2}+1-1) = 8\\sqrt{5} \\times \\sqrt{2} = 8\\sqrt{10}$ (1ن).</p>\n      <p><strong>التمرين 2 (3ن):</strong><br>1- النشر: $E = 2x^2 - 11x + 12$ (1ن).<br>2- التحليل: $E = (2x-3)(x-4)$ (1ن).<br>3- حل المعادلة: إما $x = 1.5$ أو $x = 4$ (1ن).</p>\n      <p><strong>الوضعية الإدماجية (8ن):</strong><br>1- $L \\times (2/3)L = 2400 \\Rightarrow L^2 = 3600 \\Rightarrow L = 60m$. العرض = $40m$.<br>2- المحيط = $(60+40)\\times 2 = 200m$. طول السياج = $200 - 4 = 196m$.<br>الكلفة = $196 \\times 150 = 29400 DA$.</p>\n    </div>\n  \n    </div>\n  </div>\n</div>"
    },
    "2025": {
      "title": "دورة جوان 2025 — الرياضيات",
      "paper": "<div class=\"exam-section\">\n  <div class=\"exam-part\">\n    <h3>الجزء الأول (12 نقطة)</h3>\n    <h4>التمرين الأول (03 نقاط):</h4>\n    <p>1- احسب $PGCD(720, 1080)$.<br>2- يملك بائع زهور 720 وردة حمراء و 1080 بيضاء، يريد تشكيل باقات متماثلة بأكبر عدد ممكن. ما هو عدد الباقات؟ وما هو تركيب كل باقة؟</p>\n    \n    <h4>التمرين الثاني (03 نقاط):</h4>\n    <p>حل الجملة الآتية بطريقة التعويض أو الجمع:<br>$x + y = 14$<br>$3x + 5y = 50$</p>\n    \n    <h4>التمرين الثالث (03 نقاط):</h4>\n    <p>إليك الدالة التآلفية $f(x) = 2x - 3$.<br>1- احسب صورة العدد 5.<br>2- ما هو العدد الذي صورته 7؟<br>3- أنشئ التمثيل البياني للدالة.</p>\n  </div>\n  <div class=\"exam-part\">\n    <h3>الجزء الثاني (08 نقاط): الوضعية الإدماجية</h3>\n    <p>يملك عمي أحمد قطعة أرض مثلثة الشكل $ABC$ قائمة في $B$ حيث $AB = 40m$ و $BC = 30m$.<br>أراد تقسيمها مع ابنه بحيث يأخذ الابن الجزء $AMN$ (حيث $M \\in AB$ و $N \\in AC$ و $(MN) \\parallel (BC)$).<br>إذا كان $AM = 10m$، احسب مساحة أرض الابن، ومساحة أرض الأب المتبقية.</p>\n  </div>\n  \n  <div class=\"exam-solution-box\" style=\"margin-top:20px;padding-top:20px;border-top:1px dashed var(--border)\">\n    <div class=\"student-attempt\" style=\"margin-bottom:15px\">\n      <h4 style=\"margin-bottom:10px;color:#10b981\"><i class=\"fa-solid fa-pen-nib\"></i> مساحة المحاولة:</h4>\n      <textarea id=\"attempt-2025-math\" placeholder=\"اكتب محاولتك وإجاباتك هنا قبل الاطلاع على التصحيح الرسمي...\" style=\"width:100%;height:150px;background:#ffffff;border:1px solid #10b981;border-radius:var(--r-md);padding:15px;color:#1a1410;font-family:inherit;resize:vertical;font-size:0.95rem\"></textarea>\n      <button class=\"btn btn-mint\" onclick=\"saveAttempt('2025', 'math')\" style=\"margin-top:10px;width:100%;justify-content:center;padding:12px;font-size:1rem\">\n        <i class=\"fa-solid fa-save\"></i> حفظ المحاولة والمقارنة مع التصحيح\n      </button>\n    </div>\n    <div id=\"solution-2025-math\" class=\"exam-solution\" style=\"display:none;background:#f0fdf4;color:#166534;padding:20px;border-radius:var(--r-md);margin-top:10px;border:1px solid #bbf7d0\">\n      \n      <h4>التصحيح النموذجي:</h4>\n      <p><strong>التمرين 1:</strong><br>$PGCD = 360$.<br>عدد الباقات: 360 باقة.<br>التركيب: $720/360 = 2$ وردة حمراء، $1080/360 = 3$ بيضاء.</p>\n      <p><strong>التمرين 2:</strong><br>بضرب المعادلة الأولى في $-3$: $-3x - 3y = -42$.<br>بالجمع: $2y = 8 \\Rightarrow y = 4$. إذن $x = 10$. الحل هو $(10, 4)$.</p>\n      <p><strong>الوضعية:</strong><br>$MN$ باستخدام طالس: $MN/BC = AM/AB \\Rightarrow MN/30 = 10/40 \\Rightarrow MN = 7.5m$.<br>مساحة الابن: $(10 \\times 7.5)/2 = 37.5 m^2$.<br>مساحة الأب: المساحة الكلية $((40 \\times 30)/2) - 37.5 = 600 - 37.5 = 562.5 m^2$.</p>\n    </div>\n  \n    </div>\n  </div>\n</div>"
    },
    "2026": {
      "title": "دورة 2026 — الرياضيات (موضوع رسمي)",
      "paper": "\n<div class=\"exam-section\">\n  <div class=\"exam-part\">\n    <img src=\"./assets/exams/2026/math_exam_1.png\" style=\"width:100%; border-radius:8px; margin-bottom:15px; display:block; border: 1px solid var(--border);\" alt=\"صفحة 1\">\n<img src=\"./assets/exams/2026/math_exam_2.png\" style=\"width:100%; border-radius:8px; margin-bottom:15px; display:block; border: 1px solid var(--border);\" alt=\"صفحة 2\">\n\n  </div>\n  \n  <div class=\"exam-solution-box\" style=\"margin-top:20px;padding-top:20px;border-top:1px dashed var(--border)\">\n    <div class=\"student-attempt\" style=\"margin-bottom:15px\">\n      <h4 style=\"margin-bottom:10px;color:#10b981\"><i class=\"fa-solid fa-pen-nib\"></i> مساحة المحاولة:</h4>\n      <textarea id=\"attempt-2026-math\" placeholder=\"اكتب إجابتك هنا قبل الاطلاع على التصحيح النموذجي...\" style=\"width:100%;height:150px;background:#ffffff;border:1px solid #10b981;border-radius:var(--r-md);padding:15px;color:#1a1410;font-family:inherit;resize:vertical;font-size:0.95rem\"></textarea>\n      <button class=\"btn btn-mint\" onclick=\"saveAttempt('2026', 'math')\" style=\"margin-top:10px;width:100%;justify-content:center;padding:12px;font-size:1rem\">\n        <i class=\"fa-solid fa-save\"></i> حفظ المحاولة والمقارنة مع التصحيح\n      </button>\n    </div>\n    <div id=\"solution-2026-math\" class=\"exam-solution\" style=\"display:none;background:#f0fdf4;color:#166534;padding:20px;border-radius:var(--r-md);margin-top:10px;border:1px solid #bbf7d0\">\n      <h4>التصحيح النموذجي:</h4>\n      <img src=\"./assets/exams/2026/math_sol_1.png\" style=\"width:100%; border-radius:8px; margin-bottom:15px; display:block; border: 1px solid var(--border);\" alt=\"صفحة 1\">\n<img src=\"./assets/exams/2026/math_sol_2.png\" style=\"width:100%; border-radius:8px; margin-bottom:15px; display:block; border: 1px solid var(--border);\" alt=\"صفحة 2\">\n<img src=\"./assets/exams/2026/math_sol_3.png\" style=\"width:100%; border-radius:8px; margin-bottom:15px; display:block; border: 1px solid var(--border);\" alt=\"صفحة 3\">\n<img src=\"./assets/exams/2026/math_sol_4.png\" style=\"width:100%; border-radius:8px; margin-bottom:15px; display:block; border: 1px solid var(--border);\" alt=\"صفحة 4\">\n<img src=\"./assets/exams/2026/math_sol_5.png\" style=\"width:100%; border-radius:8px; margin-bottom:15px; display:block; border: 1px solid var(--border);\" alt=\"صفحة 5\">\n\n    </div>\n  </div>\n</div>\n"
    }
  }
};;;;;;;

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
  ready: ["🚀 **الخطوة 1:** استثمر حماسك.", "💎 **الخطوة 2:** ركّز على الأفخاخ.", "👑 **الخطوة 3:** واصل."]
};
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

/* ═══ Flashcards ═══ */
const cards = [
  { q: 'ما هو عطف النسق؟', a: 'تابع يتوسّط بينه وبين متبوعه حرف عطف.' },
  { q: 'ما هو PGCD؟', a: 'أكبر قاسم مشترك، يُحسب بخوارزمية إقليدس.' },
  { q: 'ما هي أنواع البدل؟', a: 'ثلاثة: مطابق، جزء من كل، واشتمال.' },
  { q: 'ما هو $\\sqrt{50}$ مبسطاً؟', a: '$5\\sqrt{2}$' }
];
let cardIdx = 0, cardFlipped = false;
function renderCard() {
  const c = cards[cardIdx];
  const tag = document.getElementById('fc-tag');
  const txt = document.getElementById('fc-text');
  if (!tag || !txt || !c) return;
  if (cardFlipped) { tag.textContent = 'إجابة'; txt.textContent = c.a; }
  else { tag.textContent = 'سؤال'; txt.textContent = c.q; }
}
function flipCard() { Sound.tap(); cardFlipped = !cardFlipped; renderCard(); }
function nextCard() { Sound.tap(); cardIdx = (cardIdx + 1) % cards.length; cardFlipped = false; renderCard(); }
function prevCard() { Sound.tap(); cardIdx = (cardIdx - 1 + cards.length) % cards.length; cardFlipped = false; renderCard(); }

/* ═══ Quiz ═══ */
const quiz = [
  { q: 'جملة (يبتسم) في "جاء التلميذ يبتسم":', opts: [{ t: 'نعت', c: false }, { t: 'حال', c: true }] },
  { q: 'PGCD(24, 36) =', opts: [{ t: '6', c: false }, { t: '12', c: true }] },
  { q: '$\\sqrt{72}$ =', opts: [{ t: '$6\\sqrt{2}$', c: true }, { t: '$8\\sqrt{9}$', c: false }] }
];
let qIdx = 0, qScore = 0;
function startQuiz() {
  qIdx = 0; qScore = 0;
  const box = document.getElementById('quiz-box');
  const res = document.getElementById('quiz-result');
  if (box) box.style.display = 'block';
  if (res) res.style.display = 'none';
  renderQuiz();
}
function renderQuiz() {
  const q = quiz[qIdx];
  if (!q) return;
  const title = document.getElementById('quiz-title');
  if (title) title.textContent = q.q;
  const list = document.getElementById('quiz-opts');
  if (!list) return;
  list.innerHTML = '';
  q.opts.forEach(o => {
    const b = document.createElement('button');
    b.className = 'quiz-opt';
    b.textContent = o.t;
    b.onclick = () => answerQuiz(o.c);
    list.appendChild(b);
  });
}
async function answerQuiz(correct) {
  if (correct) { Sound.ok(); qScore++; } else { Sound.err(); }
  qIdx++;
  if (qIdx < quiz.length) renderQuiz();
  else {
    const box = document.getElementById('quiz-box');
    const res = document.getElementById('quiz-result');
    const score = document.getElementById('quiz-score');
    if (box) box.style.display = 'none';
    if (res) res.style.display = 'block';
    if (score) score.textContent = `🎉 ${qScore} / ${quiz.length}`;
    try {
      await EcoDB.saveAttempt({
        subject: 'mixed', year: new Date().getFullYear(),
        score: qScore, total: quiz.length, type: 'quiz'
      });
      await EcoDB.addXP(qScore * 10);
    } catch(e) {}
  }
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
  box.innerHTML = `
    <div class="card">
      <div class="section-label">📊 التحليلات</div>
      <p style="color:var(--text-muted);text-align:center;padding:40px">
        ابدأ الدروس والاختبارات لعرض التحليلات البيانية.
      </p>
    </div>
  `;
}

/* ═══ Notifications Panel ═══ */
function renderNotifSettings() {
  const box = document.getElementById('notif-content');
  if (!box) return;
  box.innerHTML = `
    <div class="card">
      <div class="section-label">حالة الإشعارات</div>
      <p style="color:var(--text-muted);text-align:center;padding:20px">
        الإشعارات المحلية قيد التطوير. تابعنا قريباً.
      </p>
    </div>
  `;
}

/* ═══ Core Functions ═══ */
let appEntered = false;
function enterApp() {
    if (appEntered) return;
    appEntered = true;
    Sound.ok();
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('gone');
    
    // AUTHENTICATION CHECK
    if (!localStorage.getItem('eco_token')) {
      const authOv = document.getElementById('ov-auth');
      if(authOv) {
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
  else if (id === 'notif') renderNotifSettings();
  else if (id === 'sync') renderSyncPanel(); 
  else if (id === 'quiz') setTimeout(startQuiz, 350);
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
      window.loadAvatar();
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
    const miniEl = document.querySelector('.avatar-mini');
    const initialEl = document.getElementById('avatar-initial');
    
    if (dataUrl) {
      if (avatarEl) {
        avatarEl.style.backgroundImage = 'url(' + dataUrl + ')';
        if(initialEl) initialEl.style.display = 'none';
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
  window.loadAvatar();
  window.loadDream();
};


/* ══════════════ AUTH & DB SYNC LOGIC ══════════════ */
const API_URL = '/api';

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
      
      window.loadAvatar();
      window.loadDream();
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
    const dataUrl = e.target.result;
    try {
      localStorage.setItem('eco_user_avatar', dataUrl);
      window.loadAvatar();
      window.saveToDB({ avatar_url: dataUrl }); // SYNC TO DB
      toast('تم تحديث الصورة بنجاح! 📸', 'ok');
    } catch (err) {
      toast('❌ الصورة كبيرة جداً، يرجى اختيار صورة أصغر بحجم أقل من 2 ميغابايت.', 'err');
    }
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



