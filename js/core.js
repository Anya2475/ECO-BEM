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
  document.getElementById('toast-text').innerHTML = msg;
  el.className = 'toast on' + (type === 'ok' ? ' ok' : type === 'err' ? ' err' : '');
  const icon = el.querySelector('i');
  if (icon) icon.className = 'fa-solid ' + (type === 'ok' ? 'fa-circle-check' : type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-info');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 2800);
  if (typeof playSound === 'function') playSound(type);
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

async function loadAIChatHistory() {
  const list = document.getElementById('chat');
  if (!list) return;
  list.innerHTML = '';
  
  const welcomeMsg = document.createElement('div');
  welcomeMsg.className = 'bubble ai';
  welcomeMsg.innerHTML = '<strong>أهلاً بك يا بطل! 🎓</strong><br>اطرح عليّ أي سؤال حول دروس المقطع الأول. سأشرح لك بأمثلة من المنهج الجزائري.';
  list.appendChild(welcomeMsg);
  
  AITeacher.history = [{ role: "system", content: "أنت معلم ذكي ومرح مخصص لمساعدة طلاب شهادة التعليم المتوسط (BEM) في الجزائر. اسمك 'المعلم الذكي'." }];
  
  try {
    const messages = await dbGetAll('ai_messages');
    if (messages && messages.length > 0) {
      messages.forEach(msg => {
        if (msg.userMessage) {
          const userBubble = document.createElement('div');
          userBubble.className = 'bubble me';
          userBubble.textContent = msg.userMessage;
          list.appendChild(userBubble);
          AITeacher.history.push({ role: 'user', content: msg.userMessage });
        }
        if (msg.aiReply) {
          const aiBubble = document.createElement('div');
          aiBubble.className = 'bubble ai';
          aiBubble.innerHTML = AITeacher.renderMarkdown(msg.aiReply);
          list.appendChild(aiBubble);
          AITeacher.history.push({ role: 'assistant', content: msg.aiReply });
        }
      });
      if (typeof renderMathIn === 'function') renderMathIn(list);
    }
  } catch(e) {
    console.error('Failed to load chat history', e);
  }
  setTimeout(() => list.scrollTop = list.scrollHeight, 100);
}

async function clearAIChatHistory() {
  if (!confirm("هل أنت متأكد أنك تريد حذف المحادثة بأكملها؟")) return;
  try {
    await dbClear('ai_messages');
    await loadAIChatHistory();
    toast('تم حذف المحادثة بنجاح!', 'success');
  } catch(e) {
    toast('حدث خطأ أثناء الحذف', 'error');
  }
}
