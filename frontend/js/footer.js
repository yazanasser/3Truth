/* footer.js — Cinematic Footer */

function initFooter() {
  const footer = document.querySelector('footer.site-footer');
  if (!footer) return;
  const i18n = window.AetherisI18n;
  const t = (key, vars, fallback) => i18n ? i18n.t(key, vars, fallback) : (fallback || key);

  footer.className = "border-t border-white/10 bg-[#030305] text-gray-400 py-12 relative z-10 overflow-hidden";
  footer.innerHTML = `
    <style>
      .footer-grid-custom {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2rem;
        justify-content: center;
      }
      @media (min-width: 768px) {
        .footer-grid-custom {
          grid-template-columns: repeat(3, 1fr);
          gap: 3rem;
        }
        .footer-col-product {
          position: relative;
          left: 25px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .footer-col-company {
          position: relative;
          right: 25px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
      }
    </style>
    <div class="container mx-auto px-6 max-w-7xl">
      <div class="footer-grid-custom mb-12 max-w-5xl mx-auto">
        <!-- Brand -->
        <div class="col-span-1">
          <a href="index.html" class="flex items-center gap-3 mb-4 group inline-flex" style="text-decoration:none;">
            <img src="assets/Logo.png" alt="Logo" class="w-8 h-8 group-hover:scale-110 transition-transform">
            <span class="text-xl font-black text-white tracking-tighter">
              AETHER<span class="text-[var(--accent-1)]">IS</span>
            </span>
          </a>
          <p class="text-sm text-gray-500 mb-6 font-medium">
            ${t('footer.description', null, i18n && i18n.isArabic() ? 'كشف ذكاء اصطناعي بمستوى المؤسسات. نحدد بصمات النماذج اللغوية بدقة عالية.' : 'Enterprise-grade artificial intelligence detection. Identifying the fingerprints of LLMs with unescapable accuracy.')}
          </p>
        </div>

        <!-- Product -->
        <div class="footer-col-product">
          <div class="text-left">
            <h4 class="text-white font-bold mb-4 uppercase tracking-wider text-sm">${i18n && i18n.isArabic() ? 'المنتج' : 'Product'}</h4>
            <ul class="space-y-3 text-sm">
              <li><a href="detector.html" class="hover:text-[var(--accent-1)] transition-colors">${i18n && i18n.isArabic() ? 'كاشف الذكاء الاصطناعي' : 'AI Detector'}</a></li>
              <li><a href="pricing.html" class="hover:text-[var(--accent-1)] transition-colors">${t('ui.pricing')}</a></li>
              <li><a href="static.html?page=docs" class="hover:text-[var(--accent-1)] transition-colors">${t('ui.documentation')}</a></li>
            </ul>
          </div>
        </div>

        <!-- Company -->
        <div class="footer-col-company">
          <div class="text-left">
            <h4 class="text-white font-bold mb-4 uppercase tracking-wider text-sm">${i18n && i18n.isArabic() ? 'الشركة' : 'Company'}</h4>
            <ul class="space-y-3 text-sm">
              <li><a href="static.html?page=about" class="hover:text-[var(--accent-1)] transition-colors">${t('ui.about')}</a></li>
              <li><a href="static.html?page=contact" class="hover:text-[var(--accent-1)] transition-colors">${t('ui.contact')}</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div class="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <p class="text-xs text-gray-500 font-medium">
          ${i18n && i18n.isArabic() ? `© ${new Date().getFullYear()} Aetheris. جميع الحقوق محفوظة.` : `&copy; ${new Date().getFullYear()} Aetheris. All rights reserved.`}
        </p>
      </div>
    </div>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', initFooter);
window.addEventListener('aetheris:languagechange', initFooter);
