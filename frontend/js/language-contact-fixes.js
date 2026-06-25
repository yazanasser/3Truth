(() => {
  const CONTACT_EMAIL = 'info@3truth.com';
  const SOURCE_TEXT = new WeakMap();
  const SOURCE_ATTRS = new WeakMap();
  const SKIP_SELECTOR = [
    'script',
    'style',
    'noscript',
    'code',
    'pre',
    'textarea',
    'input',
    'select',
    '[data-no-i18n]',
    '[data-keep-english]',
    '#provenance-code-section',
    '#breakdown-human-text',
    '#breakdown-ai-text',
    '#text-input',
    '#loading-terminal-logs'
  ].join(',');

  const EXACT = new Map(Object.entries({
    // Navigation / global
    'HOME': 'الرئيسية',
    'Home': 'الرئيسية',
    'DETECTOR': 'الكاشف',
    'Detector': 'الكاشف',
    'PRICING': 'الأسعار',
    'Pricing': 'الأسعار',
    'DOCUMENTATION': 'التوثيق',
    'Documentation': 'التوثيق',
    'ABOUT US': 'من نحن',
    'About Us': 'من نحن',
    'ABOUT': 'من نحن',
    'About': 'من نحن',
    'CONTACT': 'التواصل',
    'Contact': 'التواصل',
    'CONTACT US': 'تواصل معنا',
    'Contact Us': 'تواصل معنا',
    'LOGIN': 'تسجيل الدخول',
    'Login': 'تسجيل الدخول',
    'SIGN IN': 'تسجيل الدخول',
    'Sign In': 'تسجيل الدخول',
    'SIGN OUT': 'تسجيل الخروج',
    'Sign Out': 'تسجيل الخروج',
    'LOGOUT': 'تسجيل الخروج',
    'BETA': 'بيتا',
    'Beta': 'بيتا',
    'BETA UNLIMITED': 'بيتا غير محدودة',
    'Beta Unlimited': 'بيتا غير محدودة',
    'BY FUTUREGEN': 'بواسطة FutureGEN',
    'By Futuregen': 'بواسطة FutureGEN',
    'Arabic': 'العربية',
    'English': 'English',
    'Language': 'اللغة',
    'Favorites': 'المفضلة',
    'TOOLS': 'الأدوات',
    'Tools': 'الأدوات',
    'CATEGORIES': 'التصنيفات',
    'Categories': 'التصنيفات',
    'AI NEWS': 'أخبار الذكاء الاصطناعي',
    'AI News': 'أخبار الذكاء الاصطناعي',
    'Search': 'بحث',
    'Search AI tools...': 'ابحث عن أدوات الذكاء الاصطناعي...',
    'No results found': 'لا توجد نتائج',
    'Return Home': 'العودة للرئيسية',
    'Back to News': 'العودة إلى الأخبار',
    'Back to Pricing': 'العودة إلى الأسعار',
    'Information': 'معلومات',
    'Under Construction': 'قيد الإنشاء',

    // Detector page
    'THE APEX DETECTOR': 'الكاشف المتقدم',
    'Unescapable intelligence. Drop your content below and let the neural engine dissect the truth.': 'ذكاء لا يمكن خداعه. ضع المحتوى بالأسفل ودع المحرك العصبي يحلل الحقيقة.',
    'TEXT': 'نص',
    'IMAGE': 'صورة',
    'VIDEO': 'فيديو',
    'Text Source': 'مصدر النص',
    'Image Source': 'مصدر الصورة',
    'Video Source': 'مصدر الفيديو',
    'Input Source': 'مصدر الإدخال',
    'TEXT FORENSIC MODE': 'وضع التحليل النصي',
    'STYLOMETRY & LANGUAGE RHYTHM': 'الأسلوبية وإيقاع اللغة',
    'Stylometry & Language Rhythm': 'الأسلوبية وإيقاع اللغة',
    'Paste human, AI, humanized AI, academic, business, Arabic, or mixed-language text for structure and writing-pattern analysis.': 'ألصق نصا بشريا أو نص ذكاء اصطناعي أو نصا معدلا أو أكاديميا أو تجاريا أو عربيا أو مختلطا لتحليل البنية وأنماط الكتابة.',
    'STYLE': 'الأسلوب',
    'BURSTINESS': 'التفاوت',
    'PHRASES': 'العبارات',
    'ARABIC': 'العربية',
    'SCAN TEXT FORENSICS': 'فحص النص جنائيا',
    'ANALYZE TEXT': 'تحليل النص',
    'TEXT FORENSICS READY': 'تحليل النص جاهز',
    'Paste text to scan rhythm, phrases, burstiness, structure, and humanized-AI signals.': 'ألصق النص لفحص الإيقاع والعبارات والتفاوت والبنية وإشارات النص المعدل.',
    'SCANNING TEXT': 'جار فحص النص',
    'Reading stylometry, sentence cadence, phrase density, and multilingual signals...': 'يتم قراءة الأسلوبية وإيقاع الجمل وكثافة العبارات والإشارات متعددة اللغات...',
    'IMAGE FORENSIC MODE': 'وضع تحليل الصور',
    'Pixel & Metadata Inspection': 'فحص البكسلات والبيانات الوصفية',
    'Upload a photo, render, scan, screenshot, RAW file, or edited image for camera provenance and pixel artifact analysis.': 'ارفع صورة أو لقطة شاشة أو ملف RAW أو صورة معدلة لتحليل مصدر الكاميرا وآثار البكسلات.',
    'Checks camera provenance, EXIF traces, compression patterns, edits, fake texture, and AI rendering artifacts.': 'يفحص مصدر الكاميرا وآثار EXIF وأنماط الضغط والتعديلات والملمس المزيف وآثار التوليد بالذكاء الاصطناعي.',
    'EXIF': 'EXIF',
    'PIXELS': 'البكسلات',
    'SKIN/DETAIL': 'البشرة/التفاصيل',
    'COMPRESSION': 'الضغط',
    'SCAN IMAGE FORENSICS': 'فحص الصورة جنائيا',
    'Drop an image for pixel forensics': 'أسقط صورة لفحص البكسلات',
    'JPG, PNG, WEBP, HEIC, RAW, screenshots, edited photos': 'JPG و PNG و WEBP و HEIC و RAW ولقطات الشاشة والصور المعدلة',
    'IMAGE FORENSICS READY': 'تحليل الصور جاهز',
    'Upload one image to scan pixels, metadata, artifacts, and edit traces.': 'ارفع صورة واحدة لفحص البكسلات والبيانات الوصفية والآثار والتعديلات.',
    'SCANNING IMAGE': 'جار فحص الصورة',
    'Inspecting metadata, pixel structure, texture, and compression...': 'يتم فحص البيانات الوصفية وبنية البكسلات والملمس والضغط...',
    'VIDEO TEMPORAL MODE': 'وضع التحليل الزمني للفيديو',
    'Frame Stream Consistency': 'اتساق تسلسل الإطارات',
    'Checks frame-to-frame motion, temporal artifacts, scene continuity, codec traces, and generated-video instability.': 'يفحص الحركة بين الإطارات والآثار الزمنية واستمرارية المشهد وآثار الترميز وعدم استقرار الفيديو المولد.',
    'FRAMES': 'الإطارات',
    'MOTION': 'الحركة',
    'CODEC': 'الترميز',
    'TEMPORAL': 'زمني',
    'SCAN VIDEO FRAMES': 'فحص إطارات الفيديو',
    'Drop a video for temporal frame analysis': 'أسقط فيديو لتحليل الإطارات زمنيا',
    'MP4, MOV, WEBM, MKV, AVI, phone clips, screen recordings': 'MP4 و MOV و WEBM و MKV و AVI ومقاطع الهاتف وتسجيلات الشاشة',
    'VIDEO TIMELINE READY': 'تحليل خط الفيديو جاهز',
    'Upload one clip to scan frame consistency, motion, and encoded artifacts.': 'ارفع مقطعا واحدا لفحص اتساق الإطارات والحركة وآثار الترميز.',
    'SCANNING VIDEO': 'جار فحص الفيديو',
    'Sampling frames, motion signals, timeline continuity, and codec traces...': 'يتم أخذ عينات من الإطارات وإشارات الحركة واستمرارية الخط الزمني وآثار الترميز...',
    'Paste your text here for analysis...': 'ألصق النص هنا للتحليل...',
    'CLEAR': 'مسح',
    'LOAD SAMPLE': 'تحميل عينة',
    'Click or drag & drop to select file': 'انقر أو اسحب وأفلت لاختيار ملف',
    'Supports all major formats': 'يدعم معظم الصيغ الشائعة',
    'INITIALIZE SCAN': 'بدء الفحص',
    'INITIALIZE SCANNER': 'بدء الفحص',
    'ANALYZING...': 'جار التحليل...',
    'ANALYZING': 'جار التحليل',
    'AWAITING INPUT': 'بانتظار الإدخال',
    'The neural engine is standing by.': 'محرك التحليل جاهز للعمل.',
    'Running deep heuristics...': 'يتم تشغيل التحليل العميق...',
    'Forensic Verdict': 'نتيجة الفحص',
    'HUMAN PROBABILITY': 'احتمال أنه بشري',
    'REAL PHOTO PROBABILITY': 'احتمال أنها صورة حقيقية',
    'REAL VIDEO PROBABILITY': 'احتمال أنه فيديو حقيقي',
    'AI PROBABILITY': 'احتمال أنه ذكاء اصطناعي',
    'Neural Segment Analysis': 'تحليل المقاطع',
    'Human-Origin Content (Green Marker)': 'محتوى بشري المصدر (علامة خضراء)',
    'Synthetic-Origin Content (Blue Marker)': 'محتوى مولد آليا (علامة زرقاء)',
    'File Analysis Metadata': 'بيانات تحليل الملف',
    'Neural Provenance Code Inspector': 'مفتش مصدر الملف',
    'COPY REPORT': 'نسخ التقرير',
    'COPIED!': 'تم النسخ!',
    'CONVERT TO PDF': 'تحويل إلى PDF',
    'AI GENERATED': 'مولد بالذكاء الاصطناعي',
    'AI-GENERATED': 'مولد بالذكاء الاصطناعي',
    'AI-Generated': 'مولد بالذكاء الاصطناعي',
    'HUMAN': 'بشري',
    'Human': 'بشري',
    'REAL PHOTO': 'صورة حقيقية',
    'Real Photo': 'صورة حقيقية',
    'REAL VIDEO': 'فيديو حقيقي',
    'MIXED': 'مختلط',
    'AI Text': 'نص ذكاء اصطناعي',
    'Human Text': 'نص بشري',
    'No human-written segments identified in the source.': 'لم يتم تحديد مقاطع مكتوبة بشريا في المصدر.',
    'No synthetic/AI-generated segments identified.': 'لم يتم تحديد مقاطع مولدة بالذكاء الاصطناعي.',
    'No artificial/AI-generated segments identified.': 'لم يتم تحديد مقاطع مولدة آليا.',
    'No organic/human-written segments identified.': 'لم يتم تحديد مقاطع بشرية.',
    'Generated': 'تم الإنشاء',
    'Neural Forensic Intelligence': 'تحليل جنائي ذكي',
    'AI SCORE': 'درجة الذكاء الاصطناعي',
    'HUMAN SCORE': 'درجة البشرية',
    'Verdict': 'النتيجة',
    'Confidence': 'الثقة',
    'AI Score': 'درجة الذكاء الاصطناعي',
    'Human Score': 'درجة البشرية',
    'Please enter at least 50 characters for meaningful analysis.': 'يرجى إدخال 50 حرفا على الأقل للحصول على تحليل مفيد.',
    'Please select a file to analyze.': 'يرجى اختيار ملف لتحليله.',
    'You must be signed in to scan. Redirecting...': 'يجب تسجيل الدخول لإجراء الفحص. سيتم تحويلك...',
    'Please drop an image file.': 'يرجى إفلات ملف صورة.',
    'Please drop a video file.': 'يرجى إفلات ملف فيديو.',
    'Please select an image file.': 'يرجى اختيار ملف صورة.',
    'Please select a video file.': 'يرجى اختيار ملف فيديو.',
    'Connection failed.': 'فشل الاتصال.',
    'Click or drop PDF document': 'انقر أو أسقط مستند PDF',
    'Click or drop Word/Text document': 'انقر أو أسقط مستند Word أو نص',
    'Please select PDF or Word upload mode first.': 'يرجى اختيار وضع رفع PDF أو Word أولا.',
    'Invalid file. Please upload a PDF document.': 'ملف غير صالح. يرجى رفع مستند PDF.',
    'Invalid file. Please upload a readable text, code, data, PDF, or Word document.': 'ملف غير صالح. يرجى رفع نص أو كود أو بيانات أو PDF أو Word قابل للقراءة.',
    'No readable text could be extracted from this document.': 'تعذر استخراج نص قابل للقراءة من هذا المستند.',
    'Failed to extract text from document. It might be corrupted or protected.': 'فشل استخراج النص من المستند. قد يكون تالفا أو محميا.',
    'Please upload a readable text, code, data, PDF, or Word file.': 'يرجى رفع ملف نص أو كود أو بيانات أو PDF أو Word قابل للقراءة.',
    'UPLOAD FILE': 'رفع ملف',
    'EXTRACTING...': 'جار الاستخراج...',

    // Home page
    'NEURAL INTERROGATION ENGINE ONLINE': 'محرك الفحص الذكي جاهز',
    'ULTIMATE DETECTION PROTOCOL': 'بروتوكول الكشف المتقدم',
    'Beta v is open now: Text, Image, and Video detectors are free and unlimited for every signed-in user. Paid subscriptions are locked until production launch.': 'الإصدار التجريبي متاح الآن: أدوات كشف النصوص والصور والفيديو مجانية وغير محدودة لكل مستخدم مسجل. الاشتراكات المدفوعة مقفلة حتى إطلاق النسخة النهائية.',
    'SYS.METRIC // ACCURACY': 'مؤشر النظام // الدقة',
    'SYS.METRIC // LATENCY': 'مؤشر النظام // السرعة',
    'SYS.METRIC // SCANS': 'مؤشر النظام // الفحوصات',
    'DEEP NEURAL': 'تحليل عصبي عميق',
    'INTERROGATION.': 'للإشارات.',
    '[1] Lexical Fingerprinting': '[1] بصمة المفردات',
    '[2] Structural Perplexity Mapping': '[2] خريطة التعقيد البنيوي',
    '[3] Synthetic Anomaly Detection': '[3] كشف الشذوذ الاصطناعي',
    'SYSTEM CAPABILITIES': 'قدرات النظام',
    'QUANTUM-LEVEL PARSING': 'تحليل فائق الدقة',
    'LIGHTSPEED': 'سرعة عالية',
    'BLACK BOX SECURE': 'أمان معزول',
    'OMNI-CHANNEL FORENSICS': 'تحليل شامل متعدد الوسائط',
    'Target Acquisition': 'استقبال الهدف',
    'Neural Dissection': 'تحليل الإشارات',
    'Terminal Verdict': 'النتيجة النهائية',
    'START DETECTING NOW': 'ابدأ الكشف الآن',
    'START DETECTING FREE': 'ابدأ الكشف مجانا',
    'Start Detecting Free': 'ابدأ الكشف مجانا',
    'EXECUTE SCANNER': 'تشغيل الكاشف',
    
    // Missing Home / UI Texts
    'SYS_INIT': 'تهيئة النظام',
    '> EXECUTING HEURISTIC ANALYSIS...': '> جار تنفيذ التحليل الاستكشافي...',
    'Standard parsers fail against modern humanizers. We don\'t read words. We calculate the multi-dimensional semantic vector distance between tokens. If a machine generated it, the math will betray it.': 'تفشل المحللات القياسية أمام أدوات التأنيس الحديثة. نحن لا نقرأ الكلمات. نحن نحسب المسافة المتجهية الدلالية متعددة الأبعاد بين الرموز. إذا كان الجهاز هو من أنشأها، فإن الرياضيات ستكشف ذلك.',
    '> init scan_protocol --depth=max': '> بدء بروتوكول_الفحص --العمق=أقصى',
    '> analyzing vector space...': '> جار تحليل الفضاء المتجهي...',
    '> calculating perplexity matrix...': '> جار حساب مصفوفة التعقيد...',
    'let entropy = computeEntropy(targetData);': 'دع الانتروبيا = حساب_الانتروبيا(البيانات_المستهدفة);',
    'let burst = analyzeBurstiness(targetData);': 'دع التفاوت = تحليل_التفاوت(البيانات_المستهدفة);',
    'if (entropy < 0.34 && burst < 0.18) {': 'إذا (الانتروبيا < 0.34 && التفاوت < 0.18) {',
    'executeThreatResponse("SYNTHETIC_ORIGIN");': 'تنفيذ_استجابة_التهديد("مصدر_اصطناعي");',
    '} else {': '} وإلا {',
    'return "ORGANIC_ORIGIN";': 'إرجاع "مصدر_عضوي";',
    '> THREAT DETECTED. SYNTHETIC ORIGIN CONFIRMED.': '> تم اكتشاف تهديد. تم تأكيد المصدر الاصطناعي.',
    '>> SYSTEM CAPABILITIES': '>> قدرات النظام',
    '> Dissects semantic structures at the token level, finding the probabilistic gaps machines mathematically depend on.': '> يحلل الهياكل الدلالية على مستوى الرمز، ويكتشف الفجوات الاحتمالية التي تعتمد عليها الآلات رياضياً.',
    '> Engineered for absolute speed. Processing 10,000 tokens in <200ms.': '> مصمم للسرعة المطلقة. معالجة 10,000 رمز في أقل من 200 مللي ثانية.',
    '> Complete isolation. Zero data retention. Military-grade privacy.': '> عزل كامل. صفر احتفاظ بالبيانات. خصوصية بمستوى عسكري.',
    '> Seamlessly pivot between Text, Code, and Hex analysis in one unified intelligence dashboard.': '> تنقل بسلاسة بين تحليل النص والكود والنظام السداسي العشري في لوحة معلومات ذكية موحدة.',
    '> PHASE 01: INGESTION': '> المرحلة 01: الاستيعاب',
    'Input target data vector. Accepts raw text, documents, or direct API streams. Capacity up to 500,000 parameters per cycle.': 'أدخل متجه البيانات المستهدفة. يقبل النص الخام أو المستندات أو تدفقات API المباشرة. سعة تصل إلى 500,000 معلمة لكل دورة.',
    '> PHASE 02: ANALYSIS': '> المرحلة 02: التحليل',
    'Running 47 parallel heuristic models. Cross-referencing token entropy and structural repetition against known LLM architectures.': 'تشغيل 47 نموذجًا استكشافيًا متوازيًا. مطابقة انتروبيا الرموز والتكرار الهيكلي مع بنيات نماذج اللغة الكبيرة (LLM) المعروفة.',
    '> PHASE 03: EXECUTION': '> المرحلة 03: التنفيذ',
    'Generate absolute forensic confidence score. Heatmap pinpointing exact synthetic injection points down to the character.': 'توليد درجة ثقة جنائية مطلقة. خريطة حرارية تحدد بدقة نقاط الحقن الاصطناعي حتى مستوى الحرف.',
    '> AWAITING COMMAND. INITIATE PROTOCOL TO BEGIN FORENSIC SCAN.': '> في انتظار الأمر. ابدأ البروتوكول لبدء الفحص الجنائي.',
    '3TRUTH GLOBAL INTELLIGENCE © 2026. ALL SYSTEMS CLASSIFIED.': '3TRUTH للذكاء العالمي © 2026. جميع الأنظمة سرية.',
    'PROVENANCE_SHELL_v1.0.4_STABLE': 'صدفة_المصدر_الإصدار_1.0.4_مستقر',
    'ENCODING: UTF-8': 'الترميز: UTF-8',
    'Everything in the beta is free right now. Text, image, and video detection are open while paid plans stay locked until production launch.': 'كل شيء في النسخة التجريبية مجاني الآن. فحص النصوص والصور والفيديو متاح بينما تظل الخطط المدفوعة مقفلة حتى إطلاق النسخة النهائية.',
    'Basic is the only visible plan during beta. It includes the full beta experience for text, image, and video detection so users can test the platform freely before subscriptions launch.': 'الخطة الأساسية هي الخطة الوحيدة المرئية أثناء الإصدار التجريبي. تتضمن تجربة بيتا الكاملة لفحص النصوص والصور والفيديو حتى يتمكن المستخدمون من اختبار المنصة بحرية قبل إطلاق الاشتراكات.',
    'Beta Free': 'بيتا مجانية',
    'free during beta': 'مجاني أثناء البيتا',
    'Unlimited beta text detection': 'فحص نصوص بيتا غير محدود',
    'Unlimited beta image detection': 'فحص صور بيتا غير محدود',
    'Unlimited beta video detection': 'فحص فيديو بيتا غير محدود',
    'Reports and forensic signals included': 'التقارير والإشارات الجنائية متضمنة',
    'Paid subscriptions hidden until launch': 'الاشتراكات المدفوعة مخفية حتى الإطلاق',


    // Pricing / beta
    'Basic': 'أساسي',
    'Basic Plan': 'الخطة الأساسية',
    'BETA ACCESS': 'وصول بيتا',
    'Free Unlimited Beta': 'بيتا مجانية غير محدودة',
    'Everything in beta is free': 'كل شيء في نسخة بيتا مجاني',
    'Everything in the beta is free': 'كل شيء في نسخة بيتا مجاني',
    'All core detectors are free and unlimited while the platform is in beta.': 'كل الكواشف الأساسية مجانية وغير محدودة أثناء فترة البيتا.',
    'Current Access Level': 'مستوى الوصول الحالي',
    'Subscription Status': 'حالة الاشتراك',
    'Selected Plan': 'الخطة المختارة',
    'Payments locked during beta': 'المدفوعات مقفلة أثناء البيتا',
    'Paid subscriptions are locked during beta': 'الاشتراكات المدفوعة مقفلة أثناء البيتا',
    'No payment required': 'لا يلزم الدفع',
    'Monthly Subscription': 'اشتراك شهري',
    'MONTHLY': 'شهريا',
    'Secure Checkout': 'دفع آمن',
    'Secure Payment Processing': 'معالجة دفع آمنة',
    'Instant Account Activation': 'تفعيل فوري للحساب',
    'Initializing Basic Plan': 'جار تهيئة الخطة الأساسية',
    'Activating Basic Plan...': 'جار تفعيل الخطة الأساسية...',
    'Cardholder Name': 'اسم حامل البطاقة',
    'CARDHOLDER NAME': 'اسم حامل البطاقة',
    'Card Details': 'بيانات البطاقة',
    'Pay Now': 'ادفع الآن',
    'Processing Payment...': 'جار معالجة الدفع...',
    'Payment processor failed to load. Please refresh the page and try again.': 'فشل تحميل معالج الدفع. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
    'Not authenticated': 'لم يتم تسجيل الدخول',
    'SSL Secured Payment': 'دفع مؤمن SSL',

    // Auth
    'Secure Access': 'وصول آمن',
    'SECURE ACCESS': 'وصول آمن',
    'Thank you for visiting! Please sign in to continue.': 'شكراً لزيارتك! يرجى تسجيل الدخول للمتابعة.',
    'Verify your email to enter': 'تحقق من بريدك الإلكتروني للدخول',
    'Email Address': 'البريد الإلكتروني',
    'Verification Code': 'رمز التحقق',
    'Send Code': 'إرسال الرمز',
    'Sending...': 'جار الإرسال...',
    'Verify Identity': 'تحقق من الهوية',
    'VERIFY IDENTITY': 'تحقق من الهوية',
    'Verify & Enter': 'تحقق وادخل',
    'Authenticating...': 'جار التحقق...',
    'Resend Code': 'إعادة إرسال الرمز',
    'Already Signed In': 'تم تسجيل الدخول مسبقا',
    'You are logged in as': 'أنت مسجل الدخول باسم',
    'Go to Detector': 'الانتقال إلى الكاشف',
    'Secured by 3truth Cryptography': 'محمي بتشفير 3truth',
    'Please enter the verification code.': 'يرجى إدخال رمز التحقق.',
    'Invalid verification code. Please check and try again.': 'رمز التحقق غير صحيح. يرجى التحقق والمحاولة مرة أخرى.',
    'Failed to dispatch verification code. Please try again.': 'فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى.',
    'Failed to resend code. Please try again.': 'فشل إعادة إرسال الرمز. يرجى المحاولة مرة أخرى.',
    'Invalid email address.': 'البريد الإلكتروني غير صالح.',
    'Too many attempts. Please try again later.': 'محاولات كثيرة جدا. يرجى المحاولة لاحقا.',
    'An error occurred during authentication. Please try again.': 'حدث خطأ أثناء المصادقة. يرجى المحاولة مرة أخرى.',

    // Static / contact / footer
    'Not Found': 'غير موجود',
    'Page Under Construction': 'الصفحة قيد الإنشاء',
    'We are actively working on bringing you this content. Please check back soon.': 'نعمل حاليا على تجهيز هذا المحتوى. يرجى العودة لاحقا.',
    'Everything you need to know about AI Detector.': 'كل ما تحتاج معرفته عن كاشف الذكاء الاصطناعي.',
    'Empowering trust in the digital age.': 'تعزيز الثقة في العصر الرقمي.',
    'Careers': 'الوظائف',
    'Join our mission to build a more transparent web.': 'انضم إلى مهمتنا لبناء ويب أكثر شفافية.',
    'Blog': 'المدونة',
    'Insights and updates from the AI Detector team.': 'رؤى وتحديثات من فريق كاشف الذكاء الاصطناعي.',
    'Privacy Policy': 'سياسة الخصوصية',
    'How we protect your data.': 'كيف نحمي بياناتك.',
    'Terms of Service': 'شروط الخدمة',
    'The rules of the road.': 'قواعد الاستخدام.',
    'Cookie Policy': 'سياسة ملفات الارتباط',
    'Understanding our use of cookies.': 'فهم استخدامنا لملفات الارتباط.',
    'We would love to hear from you.': 'يسعدنا التواصل معك.',
    'Contact Channels': 'قنوات التواصل',
    'Technical Support': 'الدعم الفني',
    'Enterprise Sales': 'مبيعات الشركات',
    'Name': 'الاسم',
    'Company': 'الشركة',
    'Email': 'البريد الإلكتروني',
    'Phone': 'الهاتف',
    'Message': 'الرسالة',
    'Send Message': 'إرسال الرسالة',
    'Buy Us Coffee': 'اشتر لنا قهوة',
    'Coffee for Dev Team': 'قهوة لفريق التطوير',
    'Amount': 'المبلغ',
    'Subscribe to the Newsletter': 'اشترك في النشرة البريدية',
    'Enter your email': 'أدخل بريدك الإلكتروني',
    'Subscribe': 'اشتراك',

    // Documentation / About dynamic content
    'Getting Started': 'البدء',
    '1. Create an Account': '1. أنشئ حسابا',
    '— Sign up at': '— سجّل في',
    'using email or Google OAuth.': 'باستخدام البريد الإلكتروني أو تسجيل الدخول عبر Google.',
    '2. Beta Access': '2. وصول بيتا',
    '— During beta, every signed-in user gets free unlimited scans across Text, Image, and Video detectors. Paid subscriptions are locked until production launch.': '— أثناء البيتا، يحصل كل مستخدم مسجل على فحوصات مجانية وغير محدودة عبر كواشف النصوص والصور والفيديو. الاشتراكات المدفوعة مقفلة حتى إطلاق النسخة النهائية.',
    '3. Start Scanning': '3. ابدأ الفحص',
    '— Navigate to the Detector page, select your mode (Text, Image, or Video), paste or upload your content, and hit Analyze.': '— انتقل إلى صفحة الكاشف، اختر الوضع (نص أو صورة أو فيديو)، ثم الصق أو ارفع المحتوى واضغط تحليل.',
    'Detection Modes': 'أوضاع الكشف',
    'Text Detector': 'كاشف النصوص',
    'Image Detector': 'كاشف الصور',
    'Video Detector': 'كاشف الفيديو',
    'Analyzes semantic patterns, perplexity scores, and token entropy to identify AI-generated text from models like GPT-4, Claude, Gemini, and LLaMA.': 'يحلل الأنماط الدلالية ودرجات التعقيد وانتروبيا الرموز لتحديد النصوص المولدة بالذكاء الاصطناعي من نماذج مثل GPT-4 وClaude وGemini وLLaMA.',
    'Detects deepfake images, AI-generated art, and manipulated photos using pixel-level forensic analysis and GAN fingerprint detection.': 'يكشف الصور المزيفة والفن المولد بالذكاء الاصطناعي والصور المعدلة باستخدام تحليل جنائي على مستوى البكسل وكشف بصمات GAN.',
    'Frame-by-frame temporal analysis to detect synthetic video content, face swaps, and AI-generated motion sequences.': 'تحليل زمني إطارا بإطار لكشف الفيديوهات الاصطناعية وتبديل الوجوه وتسلسلات الحركة المولدة بالذكاء الاصطناعي.',
    'Understanding Results': 'فهم النتائج',
    'The detector outputs a forensic confidence score from 0% to 100%:': 'يعرض الكاشف درجة ثقة جنائية من 0% إلى 100%:',
    '— Likely human-written / organic content': '— غالبا محتوى بشري أو طبيعي',
    '— Mixed signals, possibly AI-assisted': '— إشارات مختلطة، وربما بمساعدة الذكاء الاصطناعي',
    '— High confidence synthetic / AI-generated': '— ثقة عالية بأنه محتوى اصطناعي أو مولد بالذكاء الاصطناعي',
    'File Limits': 'حدود الملفات',
    'Max Size': 'الحد الأقصى للحجم',
    'Formats': 'الصيغ',
    '500K chars': '500 ألف حرف',
    'Plain text, Markdown': 'نص عادي وMarkdown',
    'JPEG, PNG, WebP': 'JPEG وPNG وWebP',
    'MP4, MOV, AVI': 'MP4 وMOV وAVI',
    'Troubleshooting': 'استكشاف الأخطاء',
    'Analysis Failed': 'فشل التحليل',
    '— Ensure your file is within size limits and a supported format.': '— تأكد أن الملف ضمن حدود الحجم وبصيغة مدعومة.',
    'Slow Processing': 'المعالجة بطيئة',
    '— Video analysis may take up to 60 seconds for large files. Text and image analysis typically completes in under 5 seconds.': '— قد يستغرق تحليل الفيديو حتى 60 ثانية للملفات الكبيرة. عادة يكتمل تحليل النصوص والصور خلال أقل من 5 ثوان.',
    '— Scan quotas are disabled during beta. If scanning is blocked, refresh the page and sign in again.': '— حدود الفحص معطلة أثناء البيتا. إذا تم حظر الفحص، حدّث الصفحة وسجّل الدخول مرة أخرى.',
    'Our Mission': 'مهمتنا',
    '3truth was founded by a collective of cybersecurity experts, AI researchers, and data scientists who recognized the growing threat of undetectable synthetic media. In an era where deepfakes and AI-generated misinformation can disrupt markets and damage reputations, we built the ultimate defense mechanism.': 'تأسست 3truth على يد مجموعة من خبراء الأمن السيبراني وباحثي الذكاء الاصطناعي وعلماء البيانات الذين أدركوا الخطر المتزايد للمحتوى الاصطناعي صعب الكشف. في عصر يمكن فيه للتزييف العميق والمعلومات المضللة المولدة بالذكاء الاصطناعي أن تؤثر في الأسواق وتضر بالسمعة، بنينا آلية دفاع قوية.',
    'What We Do': 'ماذا نفعل',
    'We establish a digital perimeter of truth. By continuously training our models against the latest generative adversarial networks (GANs) and large language models (LLMs), 3truth stays one step ahead of synthetic content generation. Our platform processes millions of scans daily, protecting journalists, educators, legal teams, and enterprises from misinformation.': 'ننشئ محيطا رقميا للحقيقة. من خلال تدريب نماذجنا باستمرار ضد أحدث الشبكات التوليدية GANs ونماذج اللغة الكبيرة LLMs، تبقى 3truth متقدمة بخطوة على توليد المحتوى الاصطناعي. تعالج منصتنا ملايين الفحوصات يوميا لحماية الصحفيين والمعلمين والفرق القانونية والمؤسسات من التضليل.',
    'Our Technology': 'تقنيتنا',
    'Neural Fingerprinting': 'البصمة العصبية',
    'Our proprietary models detect subtle statistical signatures left by AI generators — patterns invisible to the human eye but unmistakable to our algorithms.': 'تكشف نماذجنا الخاصة البصمات الإحصائية الدقيقة التي تتركها مولدات الذكاء الاصطناعي — وهي أنماط لا تراها العين البشرية لكنها واضحة لخوارزمياتنا.',
    'Adversarial Training': 'التدريب الخصومي',
    'We continuously red-team our own models against the newest generators, ensuring our detection stays ahead of the generation curve.': 'نختبر نماذجنا باستمرار ضد أحدث المولدات لضمان بقاء قدرات الكشف متقدمة على منحنى التوليد.',
    'Multi-Modal Analysis': 'تحليل متعدد الوسائط',
    'Text, image, and video analysis run on separate specialized neural networks optimized for each content type.': 'تعمل تحليلات النصوص والصور والفيديو على شبكات عصبية متخصصة ومنفصلة ومحسنة لكل نوع محتوى.',
    'Real-Time Processing': 'معالجة فورية',
    'Enterprise-grade infrastructure delivers sub-second analysis for text and images, with 99.99% uptime SLA.': 'توفر بنية تحتية بمستوى المؤسسات تحليلا للنصوص والصور في أقل من ثانية، مع اتفاقية توفر 99.99%.',
    'Global Presence': 'حضور عالمي',
    'Our team operates globally with research hubs in': 'يعمل فريقنا عالميا مع مراكز بحث في',
    'San Francisco': 'سان فرانسيسكو',
    'London': 'لندن',
    '. We are dedicated to pushing the boundaries of forensic analysis and providing our clients with absolute confidence in the media they consume and distribute.': '. نحن ملتزمون بتوسيع حدود التحليل الجنائي وتوفير ثقة كاملة لعملائنا في الوسائط التي يستهلكونها ويوزعونها.',
    'By the Numbers': 'بالأرقام',
    'Training Samples': 'عينات تدريب',
    'Heuristic Models': 'نماذج تحليلية',
    'Uptime SLA': 'اتفاقية التوفر',
    'Avg Response': 'متوسط الاستجابة',
    'Get In Touch': 'تواصل معنا',
    'Whether you are looking for enterprise integration, encountering technical issues, or just want to learn more about our forensic technology, our team is here to help.': 'سواء كنت تبحث عن تكامل مؤسسي أو تواجه مشكلات تقنية أو تريد معرفة المزيد عن تقنيتنا الجنائية، فريقنا هنا لمساعدتك.',
    'General Inquiries': 'الاستفسارات العامة',
    'Headquarters': 'المقر الرئيسي',
    '3truth Global Intelligence': '3truth للذكاء العالمي',
    '100 Cyber Security Way': '100 طريق الأمن السيبراني',
    'United States': 'الولايات المتحدة',
    'Support Hours': 'ساعات الدعم',
    'Enterprise Customers': 'عملاء المؤسسات',
    '24/7 priority support with dedicated account manager. Average response time: <15 minutes.': 'دعم أولوية على مدار الساعة مع مدير حساب مخصص. متوسط وقت الاستجابة: أقل من 15 دقيقة.',
    'Standard Support': 'الدعم القياسي',
    'Monday–Friday, 9 AM – 6 PM PST. We aim to respond to all tickets within 2 hours.': 'من الاثنين إلى الجمعة، من 9 صباحا إلى 6 مساء بتوقيت المحيط الهادئ. نهدف للرد على جميع التذاكر خلال ساعتين.'
  }));

  const WORDS = new Map(Object.entries({
    'text': 'نص',
    'image': 'صورة',
    'video': 'فيديو',
    'detector': 'الكاشف',
    'detection': 'الكشف',
    'detecting': 'الكشف',
    'scan': 'فحص',
    'scanner': 'كاشف',
    'scanning': 'فحص',
    'analysis': 'تحليل',
    'analyze': 'حلل',
    'analyzing': 'تحليل',
    'forensic': 'جنائي',
    'forensics': 'تحليل جنائي',
    'neural': 'عصبي',
    'engine': 'محرك',
    'input': 'إدخال',
    'source': 'مصدر',
    'upload': 'رفع',
    'file': 'ملف',
    'photo': 'صورة',
    'real': 'حقيقي',
    'generated': 'مولد',
    'artificial': 'اصطناعي',
    'synthetic': 'مولد',
    'human': 'بشري',
    'probability': 'احتمال',
    'confidence': 'الثقة',
    'metadata': 'بيانات وصفية',
    'pixels': 'بكسلات',
    'compression': 'ضغط',
    'frame': 'إطار',
    'frames': 'إطارات',
    'motion': 'حركة',
    'temporal': 'زمني',
    'style': 'أسلوب',
    'phrases': 'عبارات',
    'language': 'لغة',
    'arabic': 'عربية',
    'english': 'إنجليزية',
    'secure': 'آمن',
    'access': 'وصول',
    'verify': 'تحقق',
    'identity': 'هوية',
    'email': 'بريد إلكتروني',
    'code': 'رمز',
    'send': 'إرسال',
    'resend': 'إعادة إرسال',
    'loading': 'تحميل',
    'ready': 'جاهز',
    'pricing': 'أسعار',
    'plan': 'خطة',
    'free': 'مجاني',
    'unlimited': 'غير محدود',
    'payment': 'دفع',
    'subscription': 'اشتراك',
    'contact': 'تواصل',
    'support': 'دعم',
    'documentation': 'توثيق',
    'about': 'من نحن',
    'privacy': 'خصوصية',
    'terms': 'شروط',
    'cookies': 'ملفات الارتباط',
    'back': 'عودة',
    'return': 'عودة',
    'home': 'الرئيسية',
    'search': 'بحث',
    'tools': 'أدوات',
    'categories': 'تصنيفات',
    'favorites': 'مفضلة',
    'high': 'عالية',
    'low': 'منخفضة',
    'medium': 'متوسطة'
  }));

  const PHRASES = [
    ...EXACT.entries(),
    ['drag & drop', 'اسحب وأفلت'],
    ['drag and drop', 'اسحب وأفلت'],
    ['click or drag', 'انقر أو اسحب'],
    ['all major formats', 'معظم الصيغ الشائعة'],
    ['signed-in user', 'مستخدم مسجل'],
    ['signed in user', 'مستخدم مسجل'],
    ['production launch', 'إطلاق النسخة النهائية'],
    ['language rhythm', 'إيقاع اللغة'],
    ['writing-pattern', 'نمط الكتابة'],
    ['writing patterns', 'أنماط الكتابة'],
    ['camera provenance', 'مصدر الكاميرا'],
    ['pixel artifact', 'آثار البكسلات'],
    ['frame-to-frame', 'بين الإطارات'],
    ['scene continuity', 'استمرارية المشهد'],
    ['screen recordings', 'تسجيلات الشاشة'],
    ['phone clips', 'مقاطع الهاتف']
  ]
    .filter(([from]) => from && /[A-Za-z]/.test(from))
    .sort((a, b) => b[0].length - a[0].length)
    .map(([from, to]) => [new RegExp(escapeRegExp(from), 'gi'), to]);

  const REVERSE = new Map([...EXACT.entries()].map(([en, ar]) => [ar, en]));

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function isArabicMode() {
    const html = document.documentElement;
    const values = [
      html.lang,
      localStorage.getItem('aetheris_language'),
      localStorage.getItem('language'),
      localStorage.getItem('lang'),
      localStorage.getItem('selectedLanguage'),
      localStorage.getItem('futuregen-language'),
      localStorage.getItem('futuregen_lang'),
      localStorage.getItem('i18nextLng')
    ].filter(Boolean).map(value => String(value).toLowerCase());

    return values.some(value => value === 'ar' || value.startsWith('ar-') || value === 'arabic') ||
      (window._3truthI18n && window._3truthI18n.isArabic && window._3truthI18n.isArabic());
  }

  function shouldSkipElement(element) {
    return !element || element.closest(SKIP_SELECTOR);
  }

  function protect(value) {
    const tokens = [];
    const patterns = [
      /\{\{[^}]+\}\}/g,
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      /https?:\/\/[^\s"'<>]+/gi,
      /\b(?:3TRUTH|3truth|FutureGEN|Futuregen|FutureGEN\.space|EmailJS|Firebase|Stripe|PayPal|PDF|RAW|EXIF|DCT|SSL|API|SSO|SLA|URL|HTML|CSS|JS|JSON|CSV|XML|WEBP|HEIC|JPG|PNG|MP4|MOV|WEBM|MKV|AVI)\b/g
    ];

    let output = value;
    patterns.forEach(pattern => {
      output = output.replace(pattern, match => {
        const token = `__I18N_TOKEN_${tokens.length}__`;
        tokens.push(match);
        return token;
      });
    });

    return { output, tokens };
  }

  function restore(value, tokens) {
    return tokens.reduce((text, token, index) => text.replaceAll(`__I18N_TOKEN_${index}__`, token), value);
  }

  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function translateUnknownWords(value) {
    return value.replace(/\b[A-Za-z][A-Za-z-]*\b/g, match => {
      const lower = match.toLowerCase();
      return WORDS.get(lower) || match;
    });
  }

  function translateString(value) {
    if (!value || !/[A-Za-z]/.test(value)) return value;

    const leading = value.match(/^\s*/)?.[0] || '';
    const trailing = value.match(/\s*$/)?.[0] || '';
    const core = value.slice(leading.length, value.length - trailing.length);
    const normalized = normalize(core);
    const exact = EXACT.get(core) || EXACT.get(normalized) || EXACT.get(normalized.toUpperCase());
    if (exact) return `${leading}${exact}${trailing}`;

    const protectedText = protect(core);
    let translated = protectedText.output;
    PHRASES.forEach(([pattern, replacement]) => {
      pattern.lastIndex = 0;
      translated = translated.replace(pattern, replacement);
    });
    translated = translateUnknownWords(translated);
    translated = restore(translated, protectedText.tokens);
    return `${leading}${translated}${trailing}`;
  }

  function sourceForTextNode(node) {
    let source = SOURCE_TEXT.get(node);
    const current = node.nodeValue || '';
    const normalized = normalize(current);
    if (source) {
      if (/[A-Za-z]/.test(current) && !/[A-Za-z]/.test(source)) {
        SOURCE_TEXT.set(node, current);
        return current;
      }
      return source;
    }
    source = REVERSE.get(normalized) || current;
    SOURCE_TEXT.set(node, source);
    return source;
  }

  function sourceForAttr(element, attr) {
    let map = SOURCE_ATTRS.get(element);
    if (!map) {
      map = {};
      SOURCE_ATTRS.set(element, map);
    }
    const current = element.getAttribute(attr) || '';
    if (map[attr] !== undefined) {
      if (/[A-Za-z]/.test(current) && !/[A-Za-z]/.test(map[attr])) {
        map[attr] = current;
      }
      return map[attr];
    }
    const recovered = REVERSE.get(normalize(current));
    if (recovered || /[A-Za-z]/.test(current)) {
      map[attr] = recovered || current;
      return map[attr];
    }
    return current;
  }

  function translateTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
        const value = node.nodeValue || '';
        return value.trim() && /[A-Za-z]/.test(value) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const source = sourceForTextNode(node);
      const next = isArabicMode() ? translateString(source) : source;
      if (node.nodeValue !== next) node.nodeValue = next;
    });
  }

  function translateAttributes(root) {
    const attrs = ['placeholder', 'aria-label', 'title', 'alt', 'data-original', 'data-en'];
    root.querySelectorAll(attrs.map(attr => `[${attr}]`).join(',')).forEach(element => {
      if (shouldSkipElement(element) && element.tagName !== 'INPUT' && element.tagName !== 'TEXTAREA') return;
      attrs.forEach(attr => {
        if (!element.hasAttribute(attr)) return;
        const source = sourceForAttr(element, attr);
        const next = isArabicMode() ? translateString(source) : source;
        if (element.getAttribute(attr) !== next) element.setAttribute(attr, next);
      });
    });

    root.querySelectorAll('button[value], input[type="button"][value], input[type="submit"][value], input[type="reset"][value]').forEach(element => {
      const source = sourceForAttr(element, 'value');
      const next = isArabicMode() ? translateString(source) : source;
      if (element.getAttribute('value') !== next) element.setAttribute('value', next);
    });
  }

  function sanitizeContactEmails(root = document.body) {
    if (!root) return;
    root.querySelectorAll('a[href^="mailto:"]').forEach(link => {
      const desiredHref = `mailto:${CONTACT_EMAIL}`;
      if (link.getAttribute('href') !== desiredHref) link.setAttribute('href', desiredHref);
      if (normalize(link.textContent) !== CONTACT_EMAIL) link.textContent = CONTACT_EMAIL;
      link.setAttribute('aria-label', CONTACT_EMAIL);
    });

    const emailPattern = /[A-Z0-9._%+-]+@3truth\.com/gi;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (shouldSkipElement(node.parentElement)) return NodeFilter.FILTER_REJECT;
        const matches = (node.nodeValue || '').match(emailPattern) || [];
        return matches.some(email => email.toLowerCase() !== CONTACT_EMAIL)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      node.nodeValue = node.nodeValue.replace(emailPattern, email => email.toLowerCase() === CONTACT_EMAIL ? email : CONTACT_EMAIL);
    });
  }

  function applySiteTranslations(root = document.body) {
    if (!root) return;
    sanitizeContactEmails(root);
    translateAttributes(root);
    translateTextNodes(root);
  }

  let scheduled = false;
  function schedule(root = document.body) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      applySiteTranslations(root || document.body);
      scheduled = false;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => schedule(document.body), { once: true });
  } else {
    schedule(document.body);
  }

  window.addEventListener('3truth:languagechange', () => {
    schedule(document.body);
    setTimeout(() => schedule(document.body), 50);
  });

  new MutationObserver(mutations => {
    if (!mutations.some(mutation => mutation.type !== 'attributes' || ['lang', 'dir', 'class', 'placeholder', 'aria-label', 'title', 'alt', 'value'].includes(mutation.attributeName))) {
      return;
    }
    schedule(document.body);
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['lang', 'dir', 'class', 'placeholder', 'aria-label', 'title', 'alt', 'value']
  });

  window._3truthSiteTranslator = {
    apply: applySiteTranslations,
    translateString,
    isArabicMode
  };
})();
