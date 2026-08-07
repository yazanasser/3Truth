// static.js - Handles dynamic content rendering for static information pages

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // Content definitions matching the original StaticPage.jsx
  const pageContent = {
    docs: {
      title: "Documentation",
      subtitle: "Everything you need to know about AI Detector.",
      content: `
              <div class="space-y-8">
                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">Getting Started</h3>
                  <div class="space-y-3">
                    <p><strong class="text-white">1. Create an Account</strong> — Sign up at <span class="text-[var(--accent-1)]">3truth.com/signin</span> using email or Google OAuth.</p>
                    <p><strong class="text-white">2. Start Scanning</strong> — Navigate to the Detector page, select your mode (Text, Image, or Video), paste or upload your content, and hit Analyze.</p>
                  </div>
                </div>

                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">Detection Modes</h3>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5">
                      <h4 class="text-white font-bold mb-2">Text Detector</h4>
                      <p class="text-gray-400 text-sm">Analyzes semantic patterns, perplexity scores, and token entropy to identify AI-generated text from models like GPT-4, Claude, Gemini, and LLaMA.</p>
                    </div>
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5">
                      <h4 class="text-white font-bold mb-2">Image Detector</h4>
                      <p class="text-gray-400 text-sm">Detects deepfake images, AI-generated art, and manipulated photos using pixel-level forensic analysis and GAN fingerprint detection.</p>
                    </div>
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5">
                      <h4 class="text-white font-bold mb-2">Video Detector</h4>
                      <p class="text-gray-400 text-sm">Frame-by-frame temporal analysis to detect synthetic video content, face swaps, and AI-generated motion sequences.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">Understanding Results</h3>
                  <p class="mb-3">The detector outputs a forensic confidence score from 0% to 100%:</p>
                  <div class="space-y-2">
                    <div class="flex items-center gap-3">
                      <span class="w-3 h-3 rounded-full bg-green-500"></span>
                      <span class="text-white font-medium">0-30%</span>
                      <span class="text-gray-400">— Likely human-written / organic content</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="w-3 h-3 rounded-full bg-yellow-500"></span>
                      <span class="text-white font-medium">30-70%</span>
                      <span class="text-gray-400">— Mixed signals, possibly AI-assisted</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="w-3 h-3 rounded-full bg-red-500"></span>
                      <span class="text-white font-medium">70-100%</span>
                      <span class="text-gray-400">— High confidence synthetic / AI-generated</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">File Limits</h3>
                  <div class="bg-black/40 border border-white/10 rounded-lg overflow-hidden">
                    <div class="grid grid-cols-3 gap-0 text-sm">
                      <div class="p-3 border-b border-r border-white/10 text-gray-500 font-bold">Type</div>
                      <div class="p-3 border-b border-r border-white/10 text-gray-500 font-bold">Max Size</div>
                      <div class="p-3 border-b border-white/10 text-gray-500 font-bold">Formats</div>
                      <div class="p-3 border-r border-b border-white/10 text-white">Text</div>
                      <div class="p-3 border-r border-b border-white/10 text-gray-300">500K chars</div>
                      <div class="p-3 border-b border-white/10 text-gray-300">Plain text, Markdown</div>
                      <div class="p-3 border-r border-b border-white/10 text-white">Image</div>
                      <div class="p-3 border-r border-b border-white/10 text-gray-300">10 MB</div>
                      <div class="p-3 border-b border-white/10 text-gray-300">JPEG, PNG, WebP</div>
                      <div class="p-3 border-r border-white/10 text-white">Video</div>
                      <div class="p-3 border-r border-white/10 text-gray-300">50 MB</div>
                      <div class="p-3 text-gray-300">MP4, MOV, AVI</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">Troubleshooting</h3>
                  <div class="space-y-3">
                    <p><strong class="text-white">Analysis Failed</strong> — Ensure your file is within size limits and a supported format.</p>
                    <p><strong class="text-white">Slow Processing</strong> — Video analysis may take up to 60 seconds for large files. Text and image analysis typically completes in under 5 seconds.</p>
                  </div>
                </div>
              </div>
            `,
    },
    about: {
      title: "About Us",
      subtitle: "Empowering trust in the digital age.",
      content: `
              <div class="space-y-8">
                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">Our Mission</h3>
                  <p>3truth was founded by a collective of cybersecurity experts, AI researchers, and data scientists who recognized the growing threat of undetectable synthetic media. In an era where deepfakes and AI-generated misinformation can disrupt markets and damage reputations, we built the ultimate defense mechanism.</p>
                </div>

                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">What We Do</h3>
                  <p>We establish a digital perimeter of truth. By continuously training our models against the latest generative adversarial networks (GANs) and large language models (LLMs), 3truth stays one step ahead of synthetic content generation. Our platform processes millions of scans daily, protecting journalists, educators, legal teams, and enterprises from misinformation.</p>
                </div>

                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">Our Technology</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5">
                      <h4 class="text-white font-bold mb-2">Neural Fingerprinting</h4>
                      <p class="text-gray-400 text-sm">Our proprietary models detect subtle statistical signatures left by AI generators — patterns invisible to the human eye but unmistakable to our algorithms.</p>
                    </div>
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5">
                      <h4 class="text-white font-bold mb-2">Adversarial Training</h4>
                      <p class="text-gray-400 text-sm">We continuously red-team our own models against the newest generators, ensuring our detection stays ahead of the generation curve.</p>
                    </div>
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5">
                      <h4 class="text-white font-bold mb-2">Multi-Modal Analysis</h4>
                      <p class="text-gray-400 text-sm">Text, image, and video analysis run on separate specialized neural networks optimized for each content type.</p>
                    </div>
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5">
                      <h4 class="text-white font-bold mb-2">Real-Time Processing</h4>
                      <p class="text-gray-400 text-sm">Enterprise-grade infrastructure delivers sub-second analysis for text and images, with 99.99% uptime SLA.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">Global Presence</h3>
                  <p>Our team operates globally with research hubs in <strong class="text-white">San Francisco</strong>, <strong class="text-white">London</strong>, and <strong class="text-white">Tokyo</strong>. We are dedicated to pushing the boundaries of forensic analysis and providing our clients with absolute confidence in the media they consume and distribute.</p>
                </div>

                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">By the Numbers</h3>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="text-center p-4">
                      <p class="text-3xl font-black text-white">500M+</p>
                      <p class="text-gray-500 text-xs uppercase tracking-widest mt-1">Training Samples</p>
                    </div>
                    <div class="text-center p-4">
                      <p class="text-3xl font-black text-white">47</p>
                      <p class="text-gray-500 text-xs uppercase tracking-widest mt-1">Heuristic Models</p>
                    </div>
                    <div class="text-center p-4">
                      <p class="text-3xl font-black text-white">99.99%</p>
                      <p class="text-gray-500 text-xs uppercase tracking-widest mt-1">Uptime SLA</p>
                    </div>
                    <div class="text-center p-4">
                      <p class="text-3xl font-black text-white">&lt;340ms</p>
                      <p class="text-gray-500 text-xs uppercase tracking-widest mt-1">Avg Response</p>
                    </div>
                  </div>
                </div>
              </div>
            `,
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
      content: `
              <div class="space-y-8">
                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">Get In Touch</h3>
                  <p>Whether you are looking for enterprise integration, encountering technical issues, or just want to learn more about our forensic technology, our team is here to help.</p>
                </div>

                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">Contact Channels</h3>
                  <div class="bg-black/40 border border-white/10 rounded-lg p-5 text-center">
                    <p class="text-[var(--accent-1)] text-xs uppercase tracking-widest mb-2">General Inquiries</p>
                    <a href="mailto:info@3truth.com" class="text-xl text-white font-bold hover:text-[var(--accent-1)] transition-colors inline-block">info@3truth.com</a>
                  </div>
                </div>
              </div>
            `,
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
  };

  if (window._3truthI18n && window._3truthI18n.isArabic()) {
    Object.assign(pageContent.docs, {
      title: "التوثيق",
      subtitle: "كل ما تحتاج معرفته عن AI Detector.",
      content: `
              <div class="space-y-8">
                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">البدء</h3>
                  <div class="space-y-3">
                    <p><strong class="text-white">1. أنشئ حسابا</strong> — سجل الدخول باستخدام البريد الإلكتروني.</p>
                    <p><strong class="text-white">2. وصول بيتا</strong> — خلال فترة البيتا يحصل كل مستخدم مسجل الدخول على فحوصات مجانية وغير محدودة للنصوص والصور والفيديو. الاشتراكات المدفوعة مقفلة حتى إطلاق النسخة الإنتاجية.</p>
                    <p><strong class="text-white">3. ابدأ الفحص</strong> — انتقل إلى صفحة الكاشف، اختر نصا أو صورة أو فيديو، ثم الصق المحتوى أو ارفع الملف وابدأ التحليل.</p>
                  </div>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">أنماط الكشف</h3>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5"><h4 class="text-white font-bold mb-2">كاشف النص</h4><p class="text-gray-400 text-sm">يحلل الأنماط الأسلوبية والإحصائية للكشف عن النصوص المولدة بالذكاء الاصطناعي بالإنجليزية والعربية.</p></div>
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5"><h4 class="text-white font-bold mb-2">كاشف الصور</h4><p class="text-gray-400 text-sm">يفحص البيانات الوصفية والبصمات البكسلية لاكتشاف الصور المولدة أو المعدلة بالذكاء الاصطناعي.</p></div>
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5"><h4 class="text-white font-bold mb-2">كاشف الفيديو</h4><p class="text-gray-400 text-sm">يفحص الإطارات والحركة والبيانات الوصفية لاكتشاف الفيديوهات الاصطناعية.</p></div>
                  </div>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">فهم النتائج</h3>
                  <p class="mb-3">يعرض الكاشف درجة ثقة جنائية من 0% إلى 100%:</p>
                  <div class="space-y-2">
                    <div class="flex items-center gap-3"><span class="w-3 h-3 rounded-full bg-green-500"></span><span class="text-white font-medium">0-30%</span><span class="text-gray-400">— غالبا محتوى بشري أو طبيعي.</span></div>
                    <div class="flex items-center gap-3"><span class="w-3 h-3 rounded-full bg-yellow-500"></span><span class="text-white font-medium">30-70%</span><span class="text-gray-400">— إشارات مختلطة وقد يكون بمساعدة ذكاء اصطناعي.</span></div>
                    <div class="flex items-center gap-3"><span class="w-3 h-3 rounded-full bg-red-500"></span><span class="text-white font-medium">70-100%</span><span class="text-gray-400">— ثقة عالية بأنه مولد بالذكاء الاصطناعي.</span></div>
                  </div>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">حدود الملفات</h3>
                  <p>يدعم النظام النصوص والصور والفيديوهات الشائعة. تجنب الملفات الكبيرة جدا أو الصيغ غير المدعومة للحصول على أفضل أداء.</p>
                </div>
              </div>
            `,
    });
    Object.assign(pageContent.about, {
      title: "من نحن",
      subtitle: "نبني أساس الثقة للعصر الرقمي.",
      content: `
              <div class="space-y-12">
                
                <section>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-4 uppercase tracking-wider">مهمتنا</h3>
                  <p>تأسست 3truth بواسطة مجموعة من خبراء الأمن السيبراني وباحثي الذكاء الاصطناعي وعلماء البيانات الذين أدركوا التهديد المتزايد للوسائط الاصطناعية غير القابلة للكشف. في عصر يمكن فيه للتزييف العميق والمعلومات المضللة المولدة بالذكاء الاصطناعي أن تعطل الأسواق وتضر بالسمعة، قمنا ببناء آلية الدفاع النهائية.</p>
                </section>

                <section>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-4 uppercase tracking-wider">ماذا نفعل</h3>
                  <p>نحن نؤسس محيطاً رقمياً للحقيقة. من خلال تدريب نماذجنا باستمرار ضد أحدث شبكات التوليد التنافسية (GANs) والنماذج اللغوية الكبيرة (LLMs)، تظل 3truth متقدمة بخطوة على توليد المحتوى الاصطناعي. تعالج منصتنا ملايين الفحوصات يومياً، لحماية الصحفيين والمعلمين والفرق القانونية والشركات من المعلومات المضللة.</p>
                </section>

                <section>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-4 uppercase tracking-wider">تقنيتنا</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div class="bg-black/40 border border-white/10 rounded-lg p-6 hover:border-[var(--accent-1)]/50 transition-colors">
                      <h4 class="text-lg font-bold text-white mb-2">البصمات العصبية</h4>
                      <p class="text-sm text-gray-400">تكتشف نماذجنا الخاصة تواقيع إحصائية دقيقة تتركها مولدات الذكاء الاصطناعي - أنماط غير مرئية للعين البشرية ولكن لا يمكن تخطيها من قبل خوارزمياتنا.</p>
                    </div>
                    <div class="bg-black/40 border border-white/10 rounded-lg p-6 hover:border-[var(--accent-1)]/50 transition-colors">
                      <h4 class="text-lg font-bold text-white mb-2">التدريب التنافسي</h4>
                      <p class="text-sm text-gray-400">نقوم باستمرار بتحدي نماذجنا الخاصة ضد أحدث المولدات، مما يضمن بقاء كشفنا متقدماً على منحنى التوليد.</p>
                    </div>
                    <div class="bg-black/40 border border-white/10 rounded-lg p-6 hover:border-[var(--accent-1)]/50 transition-colors">
                      <h4 class="text-lg font-bold text-white mb-2">التحليل متعدد الوسائط</h4>
                      <p class="text-sm text-gray-400">يتم تشغيل تحليل النصوص والصور والفيديو على شبكات عصبية متخصصة ومنفصلة تم تحسينها لكل نوع من أنواع المحتوى.</p>
                    </div>
                    <div class="bg-black/40 border border-white/10 rounded-lg p-6 hover:border-[var(--accent-1)]/50 transition-colors">
                      <h4 class="text-lg font-bold text-white mb-2">المعالجة في الوقت الفعلي</h4>
                      <p class="text-sm text-gray-400">توفر البنية التحتية من مستوى المؤسسات تحليلاً في أجزاء من الثانية للنصوص والصور، مع اتفاقية مستوى خدمة لجهوزية بنسبة 99.99٪.</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-4 uppercase tracking-wider">التواجد العالمي</h3>
                  <p>يعمل فريقنا عالمياً مع مراكز أبحاث في سان فرانسيسكو ولندن وطوكيو. نحن مكرسون لدفع حدود التحليل الجنائي وتزويد عملائنا بالثقة المطلقة في الوسائط التي يستهلكونها ويوزعونها.</p>
                </section>

                <section class="border-t border-white/10 pt-8 mt-8">
                  <h3 class="text-xl font-bold text-center mb-8 uppercase tracking-wider">بالأرقام</h3>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p class="text-3xl font-black text-[var(--accent-1)]">500M+</p>
                      <p class="text-gray-500 text-xs uppercase tracking-widest mt-1">عينات التدريب</p>
                    </div>
                    <div>
                      <p class="text-3xl font-black text-[var(--accent-1)]">47</p>
                      <p class="text-gray-500 text-xs uppercase tracking-widest mt-1">النماذج الإرشادية</p>
                    </div>
                    <div>
                      <p class="text-3xl font-black text-white">99.99%</p>
                      <p class="text-gray-500 text-xs uppercase tracking-widest mt-1">اتفاقية مستوى الخدمة</p>
                    </div>
                    <div>
                      <p class="text-3xl font-black text-white">&lt;340ms</p>
                      <p class="text-gray-500 text-xs uppercase tracking-widest mt-1">متوسط الاستجابة</p>
                    </div>
                  </div>
                </section>
              </div>
            `,
    });
    Object.assign(pageContent.contact, {
      title: "اتصل بنا",
      subtitle: "يسعدنا سماعك.",
      content: `
              <div class="space-y-8">
                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">تواصل معنا</h3>
                  <p>سواء كنت تبحث عن تكامل مؤسسي أو تواجه مشكلات تقنية أو تريد معرفة المزيد عن تقنيتنا الجنائية، فريقنا هنا لمساعدتك.</p>
                </div>

                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">قنوات التواصل</h3>
                  <div class="bg-black/40 border border-white/10 rounded-lg p-5 text-center">
                    <p class="text-[var(--accent-1)] text-xs uppercase tracking-widest mb-2">استفسارات عامة</p>
                    <a href="mailto:info@3truth.com" class="text-xl text-white font-bold hover:text-[var(--accent-1)] transition-colors inline-block">info@3truth.com</a>
                  </div>
                </div>
              </div>
            `,
    });
    ["careers", "blog", "privacy", "terms", "cookies", "security"].forEach(
      (key) => {
        const localized = window._3truthI18n.dict.ar.staticPages[key];
        if (localized) Object.assign(pageContent[key], localized);
      },
    );
  }

  // Get the page parameter from the URL (e.g., ?page=about)
  const urlParams = new URLSearchParams(window.location.search);
  let pathName = urlParams.get("page");

  // Also support path-based routing if accessed like /about directly (server rewritten to static.html)
  if (!pathName) {
    const path = window.location.pathname.replace("/", "").replace(".html", "");
    if (pageContent[path]) {
      pathName = path;
    }
  }

  const pageData = pageContent[pathName] || {
    title: pathName
      ? pathName.charAt(0).toUpperCase() + pathName.slice(1)
      : "Not Found",
    subtitle: "Page Under Construction",
    content:
      "We are actively working on bringing you this content. Please check back soon.",
  };

  // DOM Elements
  const titleEl = document.getElementById("page-title");
  const subtitleEl = document.getElementById("page-subtitle");
  const contentEl = document.getElementById("page-content");
  const labelIconEl = document.getElementById("label-icon");
  const labelTextEl = document.getElementById("label-text");
  const labelContainer = document.getElementById("page-label");
  const contentContainer = document.getElementById("page-content-container");
  const returnBtn = document.getElementById("page-return");

  // Update Content
  document.title = `${pageData.title} - 3truth`;
  titleEl.textContent = pageData.title;
  titleEl.style.opacity = "0";
  titleEl.style.transform = "translateY(20px)";

  subtitleEl.textContent = pageData.subtitle;
  subtitleEl.style.opacity = "0";

  contentEl.innerHTML = pageData.content;

  // Set Label Icon
  if (pageData.subtitle === "Page Under Construction") {
    labelIconEl.setAttribute("data-lucide", "construction");
    labelTextEl.textContent = "Under Construction";
  } else {
    labelIconEl.setAttribute("data-lucide", "info");
    labelTextEl.textContent = "Information";
  }

  // Re-initialize icons since we changed an attribute
  lucide.createIcons();

  // Start Animations Sequence
  setTimeout(() => {
    // Show Label
    labelContainer.classList.remove("opacity-0", "translate-y-4");

    // Simple fade in for Title
    gsap.to(titleEl, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out",
    });

    // Simple fade in for Subtitle (no blur)
    gsap.to(subtitleEl, {
      opacity: 1,
      duration: 1.2,
      delay: 0.3,
      ease: "power2.out",
    });

    // Content and Return button
    contentContainer.classList.remove("opacity-0", "translate-y-8");
    returnBtn.classList.remove("opacity-0", "translate-y-4");
  }, 100);
});

window.addEventListener("3truth:languagechange", () => {
  window.location.reload();
});
