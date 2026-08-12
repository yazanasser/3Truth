/* i18n.js - site-wide English/Arabic language support */
(function () {
  const STORAGE_KEY = "aetheris_language";
  const SUPPORTED = new Set(["en", "ar"]);

  const dict = {
    en: {
      languageName: "English",
      languageToggle: "Arabic",
      langCode: "EN",
      dir: "ltr",
      ui: {
        home: "HOME",
        detector: "DETECTOR",
        pricing: "PRICING",
        documentation: "DOCUMENTATION",
        about: "ABOUT US",
        contact: "CONTACT",
        login: "LOGIN",
        signOut: "SIGN OUT",
        language: "Language",
        returnHome: "Return Home",
        information: "Information",
        underConstruction: "Under Construction",
      },
      plans: {
        free: "Basic",
        pro: "Pro",
        ultimate: "Ultimate",
        tier: "{plan} tier",
        display: "{plan} Plan",
      },
      detector: {
        title: "THE APEX DETECTOR",
        subtitle:
          "Unescapable intelligence. Drop your content below and let the neural engine dissect the truth.",
        inputSource: "Input Source",
        text: "TEXT",
        image: "IMAGE",
        video: "VIDEO",
        pastePlaceholder: "Paste your text here for analysis...",
        charCount: "{count} / 25000 chars",
        clear: "CLEAR",
        loadSample: "LOAD SAMPLE",
        filePrompt: "Click or drag & drop to select file",
        fileFormats: "Supports all major formats",
        initializeScan: "INITIALIZE SCAN",
        analyzing: "ANALYZING...",
        awaitingInput: "AWAITING INPUT",
        neuralStandby: "The neural engine is standing by.",
        loadingTitle: "ANALYZING",
        loadingSub: "Running deep heuristics...",
        verdictLabel: "Forensic Verdict",
        verdictHuman: "HUMAN",
        verdictAi: "AI GENERATED",
        confidence: "{val} CONFIDENCE",
        humanProbability: "HUMAN PROBABILITY",
        realPhotoProbability: "REAL PHOTO PROBABILITY",
        realVideoProbability: "REAL VIDEO PROBABILITY",
        aiProbability: "AI PROBABILITY",
        segmentAnalysis: "Neural Segment Analysis",
        humanOrigin: "Human-Origin Content (Green Marker)",
        syntheticOrigin: "Synthetic-Origin Content (Blue Marker)",
        fileMetadata: "File Analysis Metadata",
        provenance: "Neural Provenance Code Inspector",
        copyReport: "COPY REPORT",
        copied: "COPIED!",
        pdf: "CONVERT TO PDF",
        noHumanSegments: "No human-written segments identified in the source.",
        noAiSegments: "No synthetic/AI-generated segments identified.",
        verdictAi: "AI GENERATED",
        verdictHuman: "HUMAN",
        verdictRealPhoto: "REAL PHOTO",
        verdictRealVideo: "REAL VIDEO",
        verdictMixed: "MIXED",
        aiText: "AI Text",
        humanText: "Human Text",
        noArtificialSegments: "No artificial/AI-generated segments identified.",
        noOrganicSegments: "No organic/human-written segments identified.",
        reportGenerated: "Generated",
        reportBrand: "Neural Forensic Intelligence",
        reportAiScore: "AI SCORE",
        reportHumanScore: "HUMAN SCORE",
        errors: {
          minText:
            "Please enter at least 50 characters for meaningful analysis.",
          selectFile: "Please select a file to analyze.",
          signIn: "You must be signed in to scan. Redirecting...",
          imageFile: "Please drop an image file.",
          videoFile: "Please drop a video file.",
          connection: "Connection failed.",
          limit:
            "You have reached your {plan} plan limit of {limit} scans. Redirecting to upgrade...",
        },
        sample:
          "In the rapidly evolving landscape of modern technology, leveraging synergistic paradigms is crucial. To delve into the myriad of possibilities, we must foster a holistic ecosystem that underscores pivotal transformative capabilities.",
        loadingLogs: [
          "Initializing language-aware forensic model...",
          "Normalizing lexical and punctuation signals...",
          "Measuring rhythm, entropy, and phrase fingerprints...",
          "Fusing detector confidence...",
        ],
        featureLabels: {
          model_used: "Model Used",
          vocab_tells: "Vocabulary Tells",
          semantic_entropy: "Semantic Entropy",
          humanization_attempt: "Humanization Attempt",
          language: "Language",
          dialect_analysis: "Arabic Dialect Analysis",
          arabic_ai_signals: "Arabic AI Signals",
          arabic_human_signals: "Arabic Human Signals",
          burstiness_variance: "Burstiness Variance",
          rhythm_analysis: "Rhythm Analysis",
          lexical_fingerprint: "Lexical Fingerprint",
          hidden_footprints: "Hidden Footprints",
          punctuation_tells: "Punctuation Tells",
          contraction_rate: "Contraction Rate",
          ngram_entropy: "N-Gram Entropy",
          metadata_integrity: "Metadata Integrity",
          structural_anomalies: "Structural Anomalies",
          lighting_analysis: "Lighting Analysis",
          suspected_generator: "Suspected Generator",
          file_size_kb: "File Size",
          file_size_mb: "File Size",
          container_format_risk: "Container Format Risk",
          encoder_tool: "Encoder Tool",
          hardware_provenance: "Hardware Provenance",
          duration_seconds: "Duration",
          sampled_frames: "Sampled Frames",
          temporal_flicker_ratio: "Temporal Flicker Ratio",
          high_frequency_dct: "High Frequency DCT",
        },
      },
      auth: {
        modalTitle: "Thank you for visiting! Please sign in to continue.",
        secureAccess: "Secure Access",
        verifyEmail: "Verify your email to enter",
        emailAddress: "Email Address",
        verificationCode: "Verification Code",
        resendIn: "Resend in {seconds}s",
        resendCode: "Resend Code",
        sendCode: "Send Code",
        sending: "Sending...",
        verifyIdentity: "Verify Identity",
        enterCodeSent: "Enter the 6-digit code sent to {email}",
        verifyEnter: "Verify & Enter",
        authenticating: "Authenticating...",
        securedBy: "Secured by 3truth Cryptography",
        alreadySignedIn: "Already Signed In",
        loggedInAs: "You are logged in as",
        goDetector: "Go to Detector",
        signOut: "Sign Out",
        codeSent: "Verification code sent successfully to {email}",
        devCodeSent:
          "[DEV MODE] Code sent! Check developer console or use: {code}",
        failedDispatch:
          "Failed to dispatch verification code. Please try again.",
        failedResend: "Failed to resend code. Please try again.",
        enterCode: "Please enter the verification code.",
        invalidCode: "Invalid verification code. Please check and try again.",
        emailJsError:
          "EmailJS Error: {detail}. Make sure your Public Key in js/signin.js is correct.",
        errors: {
          invalidEmail: "Invalid email address.",
          disabled: "This user account has been disabled.",
          tooMany: "Too many attempts. Please try again later.",
          methodDisabled: "Authentication method is currently disabled.",
          default: "An error occurred during authentication. Please try again.",
          legacy:
            "This account was created with a legacy password. Please contact support to migrate to password-less login.",
        },
      },
      payment: {
        back: "Back to Pricing",
        title: "Secure Checkout",
        selectedPlan: "Selected Plan",
        oneTimeFee: "Monthly Subscription",
        secureProcessing: "Secure Payment Processing",
        instantActivation: "Instant Account Activation",
        initializingPlan: "Initializing {plan} Plan",
        activatingBasic: "Activating Basic Plan...",
        oneTime: "MONTHLY",
        cardholderName: "Cardholder Name",
        cardDetails: "Card Details",
        payNow: "Pay Now",
        processing: "Processing Payment...",
        processorFailed:
          "Payment processor failed to load. Please refresh the page and try again.",
        notAuthenticated: "Not authenticated",
        ssl: "SSL Secured Payment",
        cardholderPlaceholder: "John Doe",
        previewName: "CARDHOLDER NAME",
      },
      staticPages: {
        notFoundTitle: "Not Found",
        notFoundSubtitle: "Page Under Construction",
        notFoundContent:
          "We are actively working on bringing you this content. Please check back soon.",
        docs: {
          title: "Documentation",
          subtitle: "Everything you need to know about AI Detector.",
        },
        about: {
          title: "About Us",
          subtitle: "Empowering trust in the digital age.",
        },
        careers: {
          title: "Careers",
          subtitle: "Join our mission to build a more transparent web.",
          content:
            "We are always looking for talented individuals to join our team. While we are not currently listing open positions, we encourage you to check back as we continue to grow.",
        },
        blog: {
          title: "Blog",
          subtitle: "Insights and updates from the AI Detector team.",
          content:
            "Stay tuned for the latest news, research insights, and platform updates from our experts in artificial intelligence and digital authenticity.",
        },
        contact: {
          title: "Contact Us",
          subtitle: "We would love to hear from you.",
        },
        privacy: {
          title: "Privacy Policy",
          subtitle: "How we protect your data.",
          content:
            "At AI Detector, we take your privacy seriously. We only collect the minimal amount of data necessary to provide our services. A comprehensive privacy policy outlining our data practices is being finalized.",
        },
        terms: {
          title: "Terms of Service",
          subtitle: "The rules of the road.",
          content:
            "These terms outline the rules and regulations for the use of AI Detector's website and services. Our legal team is currently updating these terms for clarity and transparency.",
        },
        cookies: {
          title: "Cookie Policy",
          subtitle: "Understanding our use of cookies.",
          content:
            "We use cookies to enhance your browsing experience and analyze site traffic. Detailed information about the specific cookies we use and how to manage your preferences will be available here.",
        },
        security: {
          title: "Security",
          subtitle: "Enterprise-grade protection.",
          content:
            "We employ industry-leading security practices to ensure your data and interactions with our platform remain safe. Detailed security documentation and compliance certificates are being prepared.",
        },
      },
    },
    ar: {
      languageName: "العربية",
      languageToggle: "English",
      langCode: "عربي",
      dir: "ltr",
      ui: {
        home: "الرئيسية",
        detector: "الكاشف",
        pricing: "الأسعار",
        documentation: "التوثيق",
        about: "من نحن",
        contact: "اتصل بنا",
        login: "تسجيل الدخول",
        signOut: "تسجيل الخروج",
        language: "اللغة",
        returnHome: "العودة للرئيسية",
        information: "معلومات",
        underConstruction: "قيد الإنشاء",
      },
      plans: {
        free: "الأساسية",
        pro: "الاحترافية",
        ultimate: "الكاملة",
        tier: "الخطة {plan}",
        display: "الخطة {plan}",
      },
      detector: {
        title: "الكاشف المتقدم",
        subtitle:
          "ألصق النص أو ارفع الملف، وسيحلل المحرك الإشارات للكشف عن الحقيقة.",
        inputSource: "مصدر الإدخال",
        text: "نص",
        image: "صورة",
        video: "فيديو",
        pastePlaceholder: "ألصق النص هنا للتحليل...",
        charCount: "{count} / 25000 حرف",
        clear: "مسح",
        loadSample: "تحميل عينة",
        filePrompt: "انقر أو اسحب الملف هنا للاختيار",
        fileFormats: "يدعم الصيغ الشائعة",
        initializeScan: "بدء الفحص",
        analyzing: "جار التحليل...",
        awaitingInput: "بانتظار الإدخال",
        neuralStandby: "محرك التحليل جاهز للعمل.",
        loadingTitle: "جار التحليل",
        loadingSub: "يتم تشغيل التحليل العميق...",
        verdictLabel: "نتيجة الفحص",
        verdictHuman: "بشري",
        verdictAi: "مولد بالذكاء الاصطناعي",
        confidence: "نسبة الثقة {val}",
        humanProbability: "احتمال أنه بشري",
        realPhotoProbability: "احتمال أنها صورة حقيقية",
        realVideoProbability: "احتمال أنه فيديو حقيقي",
        aiProbability: "احتمال أنه ذكاء اصطناعي",
        segmentAnalysis: "تحليل المقاطع",
        humanOrigin: "محتوى بشري المصدر (علامة خضراء)",
        syntheticOrigin: "محتوى مولد آليا (علامة زرقاء)",
        fileMetadata: "بيانات تحليل الملف",
        provenance: "مفتش مصدر الملف",
        copyReport: "نسخ التقرير",
        copied: "تم النسخ!",
        pdf: "تحويل إلى PDF",
        noHumanSegments: "لم يتم تحديد مقاطع مكتوبة بشريا في المصدر.",
        noAiSegments: "لم يتم تحديد مقاطع مولدة بالذكاء الاصطناعي.",
        verdictAi: "مولد بالذكاء الاصطناعي",
        verdictHuman: "بشري",
        verdictRealPhoto: "صورة حقيقية",
        verdictRealVideo: "فيديو حقيقي",
        verdictMixed: "مختلط",
        aiText: "نص ذكاء اصطناعي",
        humanText: "نص بشري",
        noArtificialSegments: "لم يتم تحديد مقاطع مولدة آليا.",
        noOrganicSegments: "لم يتم تحديد مقاطع بشرية.",
        reportGenerated: "تم الإنشاء",
        reportBrand: "تحليل جنائي ذكي",
        reportAiScore: "درجة الذكاء الاصطناعي",
        reportHumanScore: "درجة البشرية",
        errors: {
          minText: "يرجى إدخال 50 حرفا على الأقل للحصول على تحليل مفيد.",
          selectFile: "يرجى اختيار ملف لتحليله.",
          signIn: "يجب تسجيل الدخول لإجراء الفحص. سيتم تحويلك...",
          imageFile: "يرجى إفلات ملف صورة.",
          videoFile: "يرجى إفلات ملف فيديو.",
          connection: "فشل الاتصال.",
          limit:
            "لقد وصلت إلى حد خطة {plan}: {limit} فحوصات. سيتم تحويلك للترقية...",
        },
        sample:
          "من الجدير بالذكر أن التحول الرقمي أصبح عاملا محوريا في تطوير المؤسسات الحديثة. علاوة على ذلك، تسهم هذه التقنيات في تعزيز الكفاءة وتحسين جودة الخدمات. وفي الختام، يمكن القول إن الذكاء الاصطناعي يمثل فرصة استراتيجية لبناء مستقبل أكثر ابتكارا واستدامة.",
        loadingLogs: [
          "تهيئة نموذج الفحص الداعم للغة...",
          "تطبيع الإشارات اللغوية وعلامات الترقيم...",
          "قياس الإيقاع والبصمات الأسلوبية...",
          "دمج ثقة الكاشف...",
        ],
        featureLabels: {
          model_used: "النموذج المستخدم",
          vocab_tells: "مؤشرات المفردات",
          semantic_entropy: "الانتروبيا الدلالية",
          humanization_attempt: "محاولة التأنيس",
          language: "اللغة",
          dialect_analysis: "تحليل العربية",
          arabic_ai_signals: "مؤشرات عربية آلية",
          arabic_human_signals: "مؤشرات عربية بشرية",
          burstiness_variance: "تباين الإيقاع",
          rhythm_analysis: "تحليل الإيقاع",
          lexical_fingerprint: "البصمة المعجمية",
          hidden_footprints: "بصمات خفية",
          punctuation_tells: "مؤشرات الترقيم",
          contraction_rate: "معدل الاختصارات",
          ngram_entropy: "انتروبيا العبارات",
          metadata_integrity: "سلامة البيانات الوصفية",
          structural_anomalies: "شذوذات بنيوية",
          lighting_analysis: "تحليل الإضاءة",
          suspected_generator: "المولد المحتمل",
          file_size_kb: "حجم الملف",
          file_size_mb: "حجم الملف",
          container_format_risk: "مخاطر صيغة الحاوية",
          encoder_tool: "أداة الترميز",
          hardware_provenance: "مصدر الجهاز",
          duration_seconds: "المدة",
          sampled_frames: "الإطارات المفحوصة",
          temporal_flicker_ratio: "نسبة الوميض الزمني",
          high_frequency_dct: "ترددات DCT العالية",
        },
      },
      auth: {
        modalTitle: "شكراً لزيارتك! يرجى تسجيل الدخول للمتابعة.",
        secureAccess: "وصول آمن",
        verifyEmail: "تحقق من بريدك الإلكتروني للدخول",
        emailAddress: "البريد الإلكتروني",
        verificationCode: "رمز التحقق",
        resendIn: "إعادة الإرسال خلال {seconds}ث",
        resendCode: "إعادة إرسال الرمز",
        sendCode: "إرسال الرمز",
        sending: "جار الإرسال...",
        verifyIdentity: "تحقق من الهوية",
        enterCodeSent: "أدخل الرمز المكون من 6 أرقام المرسل إلى {email}",
        verifyEnter: "تحقق وادخل",
        authenticating: "جار التحقق...",
        securedBy: "محمي بتشفير 3truth",
        alreadySignedIn: "تم تسجيل الدخول مسبقاً",
        loggedInAs: "أنت مسجل الدخول باسم",
        goDetector: "الانتقال إلى الكاشف",
        signOut: "تسجيل الخروج",
        codeSent: "تم إرسال رمز التحقق بنجاح إلى {email}",
        devCodeSent:
          "[وضع التطوير] تم إرسال الرمز! تحقق من وحدة التحكم أو استخدم: {code}",
        failedDispatch: "فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى.",
        failedResend: "فشل إعادة إرسال الرمز. يرجى المحاولة مرة أخرى.",
        enterCode: "يرجى إدخال رمز التحقق.",
        invalidCode: "رمز التحقق غير صحيح. يرجى التحقق والمحاولة مرة أخرى.",
        emailJsError:
          "خطأ EmailJS: {detail}. تأكد من صحة المفتاح العام في js/signin.js.",
        errors: {
          invalidEmail: "البريد الإلكتروني غير صالح.",
          disabled: "تم تعطيل هذا الحساب.",
          tooMany: "محاولات كثيرة جدا. يرجى المحاولة لاحقا.",
          methodDisabled: "طريقة المصادقة معطلة حاليا.",
          default: "حدث خطأ أثناء المصادقة. يرجى المحاولة مرة أخرى.",
          legacy:
            "تم إنشاء هذا الحساب بكلمة مرور قديمة. يرجى التواصل مع الدعم لترحيله إلى تسجيل الدخول بدون كلمة مرور.",
        },
      },
      payment: {
        back: "العودة إلى الأسعار",
        title: "دفع آمن",
        selectedPlan: "الخطة المحددة",
        oneTimeFee: "اشتراك شهري",
        secureProcessing: "معالجة دفع آمنة",
        instantActivation: "تفعيل فوري للحساب",
        initializingPlan: "جار تهيئة الخطة {plan}...",
        activatingBasic: "جار تفعيل الخطة الأساسية...",
        oneTime: "شهرياً",
        cardholderName: "اسم حامل البطاقة",
        cardDetails: "بيانات البطاقة",
        payNow: "ادفع الآن",
        processing: "جار معالجة الدفع...",
        processorFailed:
          "فشل تحميل معالج الدفع. يرجى تحديث الصفحة والمحاولة مرة أخرى.",
        notAuthenticated: "لم يتم تسجيل الدخول",
        ssl: "دفع مؤمن SSL",
        cardholderPlaceholder: "الاسم الكامل",
        previewName: "اسم حامل البطاقة",
      },
      staticPages: {
        notFoundTitle: "غير موجود",
        notFoundSubtitle: "الصفحة قيد الإنشاء",
        notFoundContent: "نعمل حاليا على تجهيز هذا المحتوى. يرجى العودة لاحقا.",
        docs: {
          title: "التوثيق",
          subtitle: "كل ما تحتاج معرفته عن الذكاء الاصطناعي Detector.",
        },
        about: {
          title: "من نحن",
          subtitle: "نساعد على بناء الثقة في العصر الرقمي.",
        },
        careers: {
          title: "الوظائف",
          subtitle: "انضم إلى مهمتنا لبناء ويب أكثر شفافية.",
          content:
            "نبحث دائما عن مواهب مميزة للانضمام إلى فريقنا. لا توجد وظائف معلنة حاليا، لكن يمكنك العودة لاحقا مع استمرار نمو الفريق.",
        },
        blog: {
          title: "المدونة",
          subtitle: "رؤى وتحديثات من فريق الذكاء الاصطناعي Detector.",
          content:
            "ترقب آخر الأخبار والرؤى البحثية وتحديثات المنصة من خبرائنا في الذكاء الاصطناعي والأصالة الرقمية.",
        },
        contact: {
          title: "اتصل بنا",
          subtitle: "يسعدنا سماعك.",
        },
        privacy: {
          title: "سياسة الخصوصية",
          subtitle: "كيف نحمي بياناتك.",
          content:
            "نأخذ خصوصيتك بجدية. نجمع الحد الأدنى من البيانات اللازمة لتقديم خدماتنا، ونعمل على إعداد سياسة خصوصية شاملة توضح ممارسات البيانات.",
        },
        terms: {
          title: "شروط الخدمة",
          subtitle: "قواعد استخدام الخدمة.",
          content:
            "توضح هذه الشروط القواعد المنظمة لاستخدام موقع وخدمات الذكاء الاصطناعي Detector. يعمل فريقنا القانوني على تحديثها لزيادة الوضوح والشفافية.",
        },
        cookies: {
          title: "سياسة ملفات تعريف الارتباط",
          subtitle: "فهم استخدامنا للكوكيز.",
          content:
            "نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح وتحليل الزيارات. ستتوفر هنا تفاصيل إدارة التفضيلات والملفات المستخدمة.",
        },
        security: {
          title: "الأمان",
          subtitle: "حماية بمستوى المؤسسات.",
          content:
            "نستخدم ممارسات أمنية رائدة لحماية بياناتك وتفاعلاتك مع المنصة. يجري إعداد وثائق الأمان وشهادات الامتثال.",
        },
      },
    },
  };

  const exactAr = {
    EXIF: "بيانات الحفظ الوصفية",
    PIXELS: "البيكسلات",
    COMPRESSION: "الضغط",
    HUMAN: "بشري",
    AI: "ذكاء اصطناعي",
    "AI GENERATED": "مولد بالذكاء الاصطناعي",
    MIXED: "مختلط",
    "Forensic Signals Grid": "شبكة الإشارات الجنائية",
    "Advanced Diagnostics": "التشخيصات المتقدمة",

    HOME: "الرئيسية",
    DETECTOR: "الكاشف",
    PRICING: "الأسعار",
    DOCUMENTATION: "التوثيق",
    "ABOUT US": "من نحن",
    CONTACT: "اتصل بنا",
    PLANS: "الخطط",
    LOGIN: "تسجيل الدخول",
    "SIGN OUT": "تسجيل الخروج",
    "THE APEX DETECTOR": "الكاشف المتقدم",
    "Unescapable intelligence. Drop your content below and let the neural engine dissect the truth.":
      "ألصق النص أو ارفع الملف، وسيحلل المحرك الإشارات للكشف عن الحقيقة.",
    TEXT: "نص",
    IMAGE: "صورة",
    VIDEO: "فيديو",
    "Input Source": "مصدر الإدخال",
    CLEAR: "مسح",
    "LOAD SAMPLE": "تحميل عينة",
    "Click or drag & drop to select file": "انقر أو اسحب الملف هنا للاختيار",
    "Supports all major formats": "يدعم الصيغ الشائعة",
    "INITIALIZE SCAN": "بدء الفحص",
    "AWAITING INPUT": "بانتظار الإدخال",
    "The neural engine is standing by.": "محرك التحليل جاهز للعمل.",
    ANALYZING: "جار التحليل",
    "Running deep heuristics...": "يتم تشغيل التحليل العميق...",
    "Forensic Verdict": "نتيجة الفحص",
    "HUMAN PROBABILITY": "احتمال أنه بشري",
    "الذكاء الاصطناعي PROBABILITY": "احتمال أنه ذكاء اصطناعي",
    "Neural Segment Analysis": "تحليل المقاطع",
    "Human-Origin Content (Green Marker)": "محتوى بشري المصدر (علامة خضراء)",
    "Synthetic-Origin Content (Blue Marker)": "محتوى مولد آليا (علامة زرقاء)",
    "File Analysis Metadata": "بيانات تحليل الملف",
    "Neural Provenance Code Inspector": "مفتش مصدر الملف",
    "COPY REPORT": "نسخ التقرير",
    "CONVERT TO PDF": "تحويل إلى PDF",
    "ACCESS LEVELS": "مستويات الوصول",
    "Choose the bandwidth and capability level required for your forensic operations.":
      "اختر مستوى السعة والقدرات المطلوب لعمليات الفحص.",
    BASIC: "الأساسية",
    PRO: "الاحترافية",
    ULTIMATE: "الكاملة",
    "For casual verification.": "للتحقق السريع.",
    "For professionals & creators.": "للمحترفين وصناع المحتوى.",
    "Unrestricted forensic dominance.": "فحص غير محدود بقدرات متقدمة.",
    "/forever": "/دائما",
    "/month": "/شهرياً",
    "1 Scan per detector": "فحص واحد لكل كاشف",
    "Standard Heuristics": "تحليل قياسي",
    "Text, Image & Video": "النص والصورة والفيديو",
    "CURRENT PLAN": "الخطة الحالية",
    Recommended: "موصى بها",
    "3 Scans per detector": "3 فحوصات لكل كاشف",
    "Deep Neural Heuristics": "تحليل عميق",
    "Bypass Detection": "كشف محاولات التحايل",
    "UPGRADE NOW": "الترقية الآن",
    "Unlimited Detections": "فحوصات غير محدودة",
    "Zero Data Retention": "بدون احتفاظ بالبيانات",
    "Omni-channel Forensics": "تحليل شامل متعدد الوسائط",
    "Advanced PDF Reports": "تقارير PDF متقدمة",
    "Priority Support": "دعم ذو أولوية",
    "GET ULTIMATE": "احصل على الخطة الكاملة",
    MONTHLY: "شهرياً",
    "Free Plan": "الخطة الأساسية",
    "Pro Plan": "الخطة الاحترافية",
    "Ultimate Plan": "الخطة الكاملة",
    "Basic Plan": "الخطة الأساسية",
    "free tier": "الخطة الأساسية",
    "pro tier": "الخطة الاحترافية",
    "ultimate tier": "الخطة الكاملة",
    "Secure Access": "وصول آمن",
    "Verify your email to enter": "تحقق من بريدك الإلكتروني للدخول",
    "Email Address": "البريد الإلكتروني",
    "Verification Code": "رمز التحقق",
    "Resend in 60s": "إعادة الإرسال خلال 60ث",
    "Resend Code": "إعادة إرسال الرمز",
    "Send Code": "إرسال الرمز",
    "Sending...": "جار الإرسال...",
    "Verify Identity": "تحقق من الهوية",
    "Verify & Enter": "تحقق وادخل",
    "Authenticating...": "جار التحقق...",
    "Already Signed In": "تم تسجيل الدخول مسبقاً",
    "You are logged in as": "أنت مسجل الدخول باسم",
    "Go to Detector": "الانتقال إلى الكاشف",
    "Sign Out": "تسجيل الخروج",
    "Secured by 3truth Cryptography": "محمي بتشفير 3truth",
    "Secure Checkout": "دفع آمن",
    "Back to Pricing": "العودة إلى الأسعار",
    "Selected Plan": "الخطة المحددة",
    "Monthly Subscription": "اشتراك شهري",
    "Secure Payment Processing": "معالجة دفع آمنة",
    "Instant Account Activation": "تفعيل فوري للحساب",
    "Initializing Plan": "تهيئة الخطة",
    "3TRUTH_PAY": "3TRUTH_PAY",
    "CARDHOLDER NAME": "اسم حامل البطاقة",
    "Cardholder Name": "اسم حامل البطاقة",
    "Card Details": "بيانات البطاقة",
    "Pay Now": "ادفع الآن",
    "Processing Payment...": "جار معالجة الدفع...",
    "Payment processor failed to load. Please refresh the page and try again.":
      "فشل تحميل معالج الدفع. يرجى تحديث الصفحة والمحاولة مرة أخرى.",
    "Not authenticated": "لم يتم تسجيل الدخول",
    "SSL Secured Payment": "دفع مؤمن SSL",
    Information: "معلومات",
    "Return Home": "العودة للرئيسية",
    "NEURAL INTERROGATION ENGINE ONLINE": "محرك الفحص الذكي جاهز",
    "ULTIMATE DETECTION PROTOCOL": "بروتوكول الكشف المتقدم",
    "بيتا v is open now: Text, Image, and Video detectors are free and unlimited for every signed-in user. Paid subscriptions are locked until production launch.":
      "الإصدار التجريبي متاح الآن: أدوات الكشف عن النصوص والصور والفيديوهات مجانية وغير محدودة لجميع المستخدمين المسجلين. الاشتراكات المدفوعة مقفلة حتى إطلاق النسخة النهائية.",
    "INITIALIZE SCANNER": "بدء الفحص",
    "SYS.METRIC // ACCURACY": "مؤشر النظام // الدقة",
    "SYS.METRIC // LATENCY": "مؤشر النظام // السرعة",
    "SYS.METRIC // SCANS": "مؤشر النظام // الفحوصات",
    "DEEP NEURAL": "تحليل عميق",
    "INTERROGATION.": "للإشارات.",
    "[1] Lexical Fingerprinting": "[1] بصمة المفردات",
    "[2] Structural Perplexity Mapping": "[2] خريطة التعقيد البنيوي",
    "[3] Synthetic Anomaly Detection": "[3] كشف الشذوذ الاصطناعي",
    "SYSTEM CAPABILITIES": "قدرات النظام",
    "QUANTUM-LEVEL PARSING": "تحليل عالي الدقة",
    LIGHTSPEED: "سرعة عالية",
    "BLACK BOX SECURE": "أمان معزول",
    "OMNI-CHANNEL FORENSICS": "تحليل متعدد الوسائط",
    "Target Acquisition": "استقبال الهدف",
    "Neural Dissection": "تحليل الإشارات",
    "Terminal Verdict": "النتيجة النهائية",
    "START DETECTING NOW": "ابدأ الكشف الآن",
    "EXECUTE SCANNER": "تشغيل الكاشف",
  };

  const placeholderAr = {
    "Paste your text here for analysis...": "ألصق النص هنا للتحليل...",
    "John Doe": "الاسم الكامل",
    "you@example.com": "you@example.com",
  };

  const textNodeSources = new WeakMap();
  const exactEn = {
    "بيانات الحفظ الوصفية": "EXIF",
    البيكسلات: "PIXELS",
    الضغط: "COMPRESSION",
    بشري: "HUMAN",
    "ذكاء اصطناعي": "AI",
    "مولد بالذكاء الاصطناعي": "AI GENERATED",
    مختلط: "MIXED",
    "شبكة الإشارات الجنائية": "Forensic Signals Grid",
    "التشخيصات المتقدمة": "Advanced Diagnostics",
  };
  for (const [en, ar] of Object.entries(exactAr)) {
    exactEn[ar] = en;
  }

  function getInitialLanguage() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("lang");
    if (SUPPORTED.has(fromUrl)) {
      try {
        localStorage.setItem(STORAGE_KEY, fromUrl);
      } catch (e) {}
      return fromUrl;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED.has(saved)) return saved;
    } catch (e) {}
    return "en";
  }

  let currentLanguage = getInitialLanguage();

  function getByPath(obj, path) {
    return path
      .split(".")
      .reduce(
        (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
        obj,
      );
  }

  function format(value, vars) {
    if (typeof value !== "string") return value;
    return value.replace(/\{(\w+)\}/g, (_, key) =>
      vars && vars[key] !== undefined ? vars[key] : `{${key}}`,
    );
  }

  function t(path, vars, fallback) {
    const value = getByPath(dict[currentLanguage], path);
    if (value === undefined) {
      const enValue = getByPath(dict.en, path);
      return format(enValue !== undefined ? enValue : fallback || path, vars);
    }
    return format(value, vars);
  }

  function isArabic() {
    return currentLanguage === "ar";
  }

  function updateDocumentDirection() {
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = "ltr"; // ALWAYS keep LTR layout for both languages
    document.body && document.body.classList.toggle("is-rtl", false); // Disable RTL styling
  }

  function translateElementAttrs(root) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    root.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute(
        "placeholder",
        t(el.getAttribute("data-i18n-placeholder")),
      );
    });
    root.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
    });
  }

  function translateTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (
          parent.closest(
            "script, style, code, pre, textarea, [data-no-i18n], #provenance-code-section",
          )
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });

    let node;
    while ((node = walker.nextNode())) {
      const raw = node.nodeValue;
      const trimmed = raw.trim();
      let source = textNodeSources.get(node);
      if (!source) {
        source = trimmed;
        if (exactEn[source]) source = exactEn[source]; // Recover English if it was cached as Arabic
        textNodeSources.set(node, source);
      }
      const translated = isArabic() ? exactAr[source] || source : source;
      if (translated && translated !== trimmed) {
        const leading = raw.match(/^\s*/)[0];
        const trailing = raw.match(/\s*$/)[0];
        node.nodeValue = `${leading}${translated}${trailing}`;

        if (node.parentElement) {
          if (node.parentElement.hasAttribute("data-original")) {
            node.parentElement.setAttribute("data-original", translated);
          }
          if (node.parentElement.hasAttribute("data-en")) {
            node.parentElement.setAttribute("data-en", translated);
          }
        }
      }
    }
  }

  function translatePlaceholders(root) {
    root
      .querySelectorAll("input[placeholder], textarea[placeholder]")
      .forEach((el) => {
        if (!el.dataset.i18nSourcePlaceholder) {
          el.dataset.i18nSourcePlaceholder =
            el.getAttribute("placeholder") || "";
        }
        const source = el.dataset.i18nSourcePlaceholder;
        el.setAttribute(
          "placeholder",
          isArabic() ? placeholderAr[source] || source : source,
        );
      });
  }

  function makeLangButton(classes) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = classes;
    btn.setAttribute("data-no-i18n", "true");
    btn.setAttribute("aria-label", t("ui.language"));
    btn.addEventListener("click", () => setLang(isArabic() ? "en" : "ar"));
    return btn;
  }

  function renderLangButtons() {
    document.querySelectorAll("[data-language-switcher]").forEach((btn) => {
      btn.textContent = dict[currentLanguage].languageToggle;
      btn.setAttribute("aria-label", t("ui.language"));
    });
  }

  function injectLanguageControls() {
    if (!document.querySelector('[data-language-switcher="desktop"]')) {
      const navLogin = document.getElementById("nav-login-btn");
      const target = navLogin && navLogin.parentElement;
      if (target) {
        target.classList.remove("gap-3");
        target.classList.add("gap-4");
        const btn = makeLangButton(
          "h-10 px-6 flex items-center justify-center border border-white/15 text-white hover:text-[var(--accent-1)] hover:border-[var(--accent-1)] transition-colors font-black text-sm tracking-wider whitespace-nowrap flex-shrink-0",
        );
        btn.dataset.languageSwitcher = "desktop";
        target.insertBefore(btn, navLogin);
      }
    }

    if (!document.querySelector('[data-language-switcher="mobile"]')) {
      const mobileList = document.querySelector("#mobile-menu .flex.flex-col");
      if (mobileList) {
        const btn = makeLangButton(
          "text-white hover:text-[var(--accent-1)] text-left font-black",
        );
        btn.dataset.languageSwitcher = "mobile";
        mobileList.appendChild(btn);
      }
    }

    if (
      !document.querySelector('[data-language-switcher="floating"]') &&
      !document.getElementById("nav-login-btn")
    ) {
      const btn = makeLangButton(
        "fixed top-4 right-4 z-[200] px-4 py-2 bg-black/70 border border-white/15 text-white hover:text-[var(--accent-1)] hover:border-[var(--accent-1)] transition-colors font-black text-xs tracking-wider rounded-lg backdrop-blur",
      );
      btn.dataset.languageSwitcher = "floating";
      document.body.appendChild(btn);
    }

    renderLangButtons();
  }

  function applyTranslations(root, updateDir = false) {
    if (updateDir) updateDocumentDirection();
    injectLanguageControls();
    const scope = root || document.body || document.documentElement;
    translateElementAttrs(scope);
    translateTextNodes(scope);
    translatePlaceholders(scope);
    renderLangButtons();
    if (window.lucide) window.lucide.createIcons();
  }

  function setLang(lang) {
    if (!SUPPORTED.has(lang) || lang === currentLanguage) return;
    currentLanguage = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
    applyTranslations(document.body || document.documentElement, true);
    window.dispatchEvent(
      new CustomEvent("3truth:languagechange", {
        detail: { language: currentLanguage },
      }),
    );
  }

  updateDocumentDirection();
  applyTranslations(document.body || document.documentElement, true);

  window._3truthI18n = {
    dict,
    t,
    setLang,
    applyTranslations,
    getLang: () => currentLanguage,
    isArabic,
    featureLabel(key) {
      return t(`detector.featureLabels.${key}`, null, key.replace(/_/g, " "));
    },
    planLabel(plan) {
      const key = String(plan || "").toLowerCase();
      return t(`plans.${key}`, null, plan || "");
    },
    planDisplay(plan) {
      const label = this.planLabel(plan);
      return t("plans.display", { plan: label }, `${label} Plan`);
    },
    planTier(plan) {
      const label = this.planLabel(plan);
      return t("plans.tier", { plan: label }, `${label} tier`);
    },
  };
  window.I18N = window._3truthI18n;

  document.addEventListener("DOMContentLoaded", () =>
    applyTranslations(document.body, false),
  );
})();
