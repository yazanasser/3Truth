// static.js - Handles dynamic content rendering for static information pages

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Content definitions matching the original StaticPage.jsx
    const pageContent = {
        docs: {
            title: 'Documentation',
            subtitle: 'Everything you need to know about AI Detector.',
            content: `
              <div class="space-y-8">
                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">Getting Started</h3>
                  <div class="space-y-3">
                    <p><strong class="text-white">1. Create an Account</strong> — Sign up at <span class="text-[var(--accent-1)]">aetheris.ai/signin</span> using email or Google OAuth.</p>
                    <p><strong class="text-white">2. Choose a Plan</strong> — The Basic plan gives you free scans across all detectors. Pro and Ultimate unlock advanced features and higher limits.</p>
                    <p><strong class="text-white">3. Start Scanning</strong> — Navigate to the Detector page, select your mode (Text, Image, or Video), paste or upload your content, and hit Analyze.</p>
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
                    <p><strong class="text-white">Scan Quota Reached</strong> — Upgrade your plan for additional scans, or wait for your quota to reset (monthly cycle).</p>
                  </div>
                </div>
              </div>
            `
        },
        about: {
            title: 'About Us',
            subtitle: 'Empowering trust in the digital age.',
            content: `
              <div class="space-y-8">
                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">Our Mission</h3>
                  <p>Aetheris was founded by a collective of cybersecurity experts, AI researchers, and data scientists who recognized the growing threat of undetectable synthetic media. In an era where deepfakes and AI-generated misinformation can disrupt markets and damage reputations, we built the ultimate defense mechanism.</p>
                </div>

                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">What We Do</h3>
                  <p>We establish a digital perimeter of truth. By continuously training our models against the latest generative adversarial networks (GANs) and large language models (LLMs), Aetheris stays one step ahead of synthetic content generation. Our platform processes millions of scans daily, protecting journalists, educators, legal teams, and enterprises from misinformation.</p>
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
            `
        },
        careers: {
            title: 'Careers',
            subtitle: 'Join our mission to build a more transparent web.',
            content: 'We are always looking for talented individuals to join our team. While we are not currently listing open positions, we encourage you to check back as we continue to grow.'
        },
        blog: {
            title: 'Blog',
            subtitle: 'Insights and updates from the AI Detector team.',
            content: 'Stay tuned for the latest news, research insights, and platform updates from our experts in artificial intelligence and digital authenticity.'
        },
        contact: {
            title: 'Contact Us',
            subtitle: 'We would love to hear from you.',
            content: `
              <div class="space-y-8">
                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">Get In Touch</h3>
                  <p>Whether you are looking for enterprise integration, encountering technical issues, or just want to learn more about our forensic technology, our team is here to help.</p>
                </div>

                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">Contact Channels</h3>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5 text-center">
                      <p class="text-[var(--accent-1)] text-xs uppercase tracking-widest mb-2">General Inquiries</p>
                      <p class="text-white font-bold">info@aetheris.ai</p>
                    </div>
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5 text-center">
                      <p class="text-[var(--accent-1)] text-xs uppercase tracking-widest mb-2">Technical Support</p>
                      <p class="text-white font-bold">support@aetheris.ai</p>
                    </div>
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5 text-center">
                      <p class="text-[var(--accent-1)] text-xs uppercase tracking-widest mb-2">Enterprise Sales</p>
                      <p class="text-white font-bold">sales@aetheris.ai</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">Headquarters</h3>
                  <div class="bg-black/40 border border-white/10 rounded-lg p-5">
                    <p class="text-white font-bold mb-1">Aetheris Global Intelligence</p>
                    <p class="text-gray-400">100 Cyber Security Way</p>
                    <p class="text-gray-400">San Francisco, CA 94105</p>
                    <p class="text-gray-400">United States</p>
                  </div>
                </div>

                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">Support Hours</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5">
                      <p class="text-white font-bold mb-1">Enterprise Customers</p>
                      <p class="text-gray-400 text-sm">24/7 priority support with dedicated account manager. Average response time: &lt;15 minutes.</p>
                    </div>
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5">
                      <p class="text-white font-bold mb-1">Standard Support</p>
                      <p class="text-gray-400 text-sm">Monday–Friday, 9 AM – 6 PM PST. We aim to respond to all tickets within 2 hours.</p>
                    </div>
                  </div>
                </div>
              </div>
            `
        },
        privacy: {
            title: 'Privacy Policy',
            subtitle: 'How we protect your data.',
            content: 'At AI Detector, we take your privacy seriously. We only collect the minimal amount of data necessary to provide our services. A comprehensive privacy policy outlining our data practices is being finalized.'
        },
        terms: {
            title: 'Terms of Service',
            subtitle: 'The rules of the road.',
            content: 'These terms outline the rules and regulations for the use of AI Detector\'s website and services. Our legal team is currently updating these terms for clarity and transparency.'
        },
        cookies: {
            title: 'Cookie Policy',
            subtitle: 'Understanding our use of cookies.',
            content: 'We use cookies to enhance your browsing experience and analyze site traffic. Detailed information about the specific cookies we use and how to manage your preferences will be available here.'
        },
        security: {
            title: 'Security',
            subtitle: 'Enterprise-grade protection.',
            content: 'We employ industry-leading security practices to ensure your data and interactions with our platform remain safe. Detailed security documentation and compliance certificates are being prepared.'
        }
    };

    if (window.AetherisI18n && window.AetherisI18n.isArabic()) {
        Object.assign(pageContent.docs, {
            title: 'التوثيق',
            subtitle: 'كل ما تحتاج معرفته عن AI Detector.',
            content: `
              <div class="space-y-8">
                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">البدء</h3>
                  <div class="space-y-3">
                    <p><strong class="text-white">1. أنشئ حسابا</strong> — سجل الدخول باستخدام البريد الإلكتروني.</p>
                    <p><strong class="text-white">2. اختر خطة</strong> — تمنحك الخطة Basic فحوصات أساسية، بينما تفتح Pro وUltimate حدودا أعلى وميزات إضافية.</p>
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
            `
        });
        Object.assign(pageContent.about, {
            title: 'من نحن',
            subtitle: 'نساعد على بناء الثقة في العصر الرقمي.',
            content: `
              <div class="space-y-8">
                <div><h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">مهمتنا</h3><p>تعمل Aetheris على كشف المحتوى الاصطناعي وحماية المستخدمين من التضليل الرقمي عبر تحليل النصوص والصور والفيديو.</p></div>
                <div><h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">ماذا نفعل</h3><p>نبني طبقة تحقق رقمية تساعد الصحفيين والمعلمين والشركات والأفراد على تقييم أصالة المحتوى قبل الاعتماد عليه.</p></div>
                <div><h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">تقنيتنا</h3><p>نجمع بين البصمات الأسلوبية، التحليل الإحصائي، فحص البيانات الوصفية، والمؤشرات البصرية لاكتشاف أنماط التوليد الاصطناعي.</p></div>
              </div>
            `
        });
        Object.assign(pageContent.contact, {
            title: 'اتصل بنا',
            subtitle: 'يسعدنا سماعك.',
            content: `
              <div class="space-y-8">
                <div><h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">تواصل معنا</h3><p>للاستفسارات العامة أو الدعم الفني أو طلبات الشركات، يمكنك التواصل معنا عبر القنوات التالية.</p></div>
                <div>
                  <h3 class="text-xl font-bold text-[var(--accent-1)] mb-3 uppercase tracking-wider">قنوات التواصل</h3>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5 text-center"><p class="text-[var(--accent-1)] text-xs uppercase tracking-widest mb-2">استفسارات عامة</p><p class="text-white font-bold">info@aetheris.ai</p></div>
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5 text-center"><p class="text-[var(--accent-1)] text-xs uppercase tracking-widest mb-2">الدعم الفني</p><p class="text-white font-bold">support@aetheris.ai</p></div>
                    <div class="bg-black/40 border border-white/10 rounded-lg p-5 text-center"><p class="text-[var(--accent-1)] text-xs uppercase tracking-widest mb-2">الشركات</p><p class="text-white font-bold">sales@aetheris.ai</p></div>
                  </div>
                </div>
              </div>
            `
        });
        ['careers', 'blog', 'privacy', 'terms', 'cookies', 'security'].forEach(key => {
            const localized = window.AetherisI18n.dict.ar.staticPages[key];
            if (localized) Object.assign(pageContent[key], localized);
        });
    }

    // Get the page parameter from the URL (e.g., ?page=about)
    const urlParams = new URLSearchParams(window.location.search);
    let pathName = urlParams.get('page');

    // Also support path-based routing if accessed like /about directly (server rewritten to static.html)
    if (!pathName) {
        const path = window.location.pathname.replace('/', '').replace('.html', '');
        if (pageContent[path]) {
            pathName = path;
        }
    }

    const pageData = pageContent[pathName] || {
        title: pathName ? pathName.charAt(0).toUpperCase() + pathName.slice(1) : 'Not Found',
        subtitle: 'Page Under Construction',
        content: 'We are actively working on bringing you this content. Please check back soon.'
    };

    // DOM Elements
    const titleEl = document.getElementById('page-title');
    const subtitleEl = document.getElementById('page-subtitle');
    const contentEl = document.getElementById('page-content');
    const labelIconEl = document.getElementById('label-icon');
    const labelTextEl = document.getElementById('label-text');
    const labelContainer = document.getElementById('page-label');
    const contentContainer = document.getElementById('page-content-container');
    const returnBtn = document.getElementById('page-return');

    // Update Content
    document.title = `${pageData.title} - Aetheris`;
    subtitleEl.textContent = pageData.subtitle;
    contentEl.innerHTML = pageData.content;

    // Set Label Icon
    if (pageData.subtitle === 'Page Under Construction') {
        labelIconEl.setAttribute('data-lucide', 'construction');
        labelTextEl.textContent = 'Under Construction';
    } else {
        labelIconEl.setAttribute('data-lucide', 'info');
        labelTextEl.textContent = 'Information';
    }
    
    // Re-initialize icons since we changed an attribute
    lucide.createIcons();

    // GSAP Animations (Replicating LetterPullUp and BlurText)
    
    // 1. LetterPullUp for Title
    const letters = pageData.title.split('');
    titleEl.innerHTML = '';
    letters.forEach(letter => {
        const span = document.createElement('span');
        span.textContent = letter === ' ' ? '\u00A0' : letter;
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        span.style.transform = 'translateY(20px)';
        titleEl.appendChild(span);
    });

    // Start Animations Sequence
    setTimeout(() => {
        // Show Label
        labelContainer.classList.remove('opacity-0', 'translate-y-4');
        
        // Title Letters
        gsap.to(titleEl.children, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.05,
            ease: 'power3.out'
        });

        // BlurText Subtitle
        gsap.to(subtitleEl, {
            opacity: 1,
            filter: 'blur(0px)',
            duration: 1.2,
            delay: 0.5,
            ease: 'power2.out'
        });
        
        // Content and Return button
        contentContainer.classList.remove('opacity-0', 'translate-y-8');
        returnBtn.classList.remove('opacity-0', 'translate-y-4');
        
    }, 100);
});

window.addEventListener('aetheris:languagechange', () => {
    window.location.reload();
});
