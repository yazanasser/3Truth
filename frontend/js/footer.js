/* footer.js — Cinematic Footer */

function initFooter() {
  const footer = document.querySelector("footer.site-footer");
  if (!footer) return;
  const i18n = window._3truthI18n;
  const t = (key, vars, fallback) =>
    i18n ? i18n.t(key, vars, fallback) : fallback || key;

  footer.className =
    "border-t border-white/10 bg-[#030305] text-gray-400 py-12 relative z-10 overflow-hidden";
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
          <a href="/" class="inline-flex items-center gap-3 mb-4 group" style="text-decoration:none;">
            <img src="assets/Logo.png" alt="Logo" class="h-8 w-auto object-contain group-hover:scale-110 transition-transform">
            
          </a>
          <p class="text-sm text-gray-500 mb-6 font-medium">
            ${t("footer.description", null, i18n && i18n.isArabic() ? "كشف ذكاء اصطناعي بمستوى المؤسسات. نحدد بصمات النماذج اللغوية بدقة عالية." : "Enterprise-grade artificial intelligence detection. Identifying the fingerprints of LLMs with unescapable accuracy.")}
          </p>
        </div>

        <!-- Product -->
        <div class="footer-col-product">
          <div class="text-left">
            <h4 class="text-white font-bold mb-4 uppercase tracking-wider text-sm">${i18n && i18n.isArabic() ? "المنتج" : "Product"}</h4>
            <ul class="space-y-3 text-sm">
              <li><a href="/scan" class="hover:text-[var(--accent-1)] transition-colors">${i18n && i18n.isArabic() ? "كاشف الذكاء الاصطناعي" : "AI Detector"}</a></li>
              <li><a href="/plans" class="hover:text-[var(--accent-1)] transition-colors">${t("ui.pricing")}</a></li>
              <li><a href="/info?page=docs" class="hover:text-[var(--accent-1)] transition-colors">${t("ui.documentation")}</a></li>
            </ul>
          </div>
        </div>

        <!-- Company -->
        <div class="footer-col-company">
          <div class="text-left">
            <h4 class="text-white font-bold mb-4 uppercase tracking-wider text-sm">${i18n && i18n.isArabic() ? "الشركة" : "Company"}</h4>
            <ul class="space-y-3 text-sm">
              <li><a href="/info?page=about" class="hover:text-[var(--accent-1)] transition-colors">${t("ui.about")}</a></li>
              <li><a href="/info?page=contact" class="hover:text-[var(--accent-1)] transition-colors">${t("ui.contact")}</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div class="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <p class="text-xs text-gray-500 font-medium">
          ${i18n && i18n.isArabic() ? `© ${new Date().getFullYear()} 3truth. جميع الحقوق محفوظة.` : `&copy; ${new Date().getFullYear()} 3truth. All rights reserved.`}
        </p>
      </div>
    </div>
  `;
  if (typeof lucide !== "undefined") lucide.createIcons();
}

document.addEventListener("DOMContentLoaded", initFooter);
window.addEventListener("3truth:languagechange", initFooter);

// Live reload script for development
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  const evtSource = new EventSource("/livereload");
  let wasConnected = false;
  evtSource.onopen = () => {
    if (wasConnected) location.reload();
    wasConnected = true;
  };
  evtSource.onerror = () => {
    // Server disconnected, wait for reconnect to trigger reload
  };
}
