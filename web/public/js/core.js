// ==========================================================================
// APPANDOR CORE: GENERAL THINGS MOSTLY ALL SITES
// ==========================================================================

// GLOBALER HTTP-WÄCHTER (PUNKT 1): Überschreibt das native fetch des Browsers
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch(...args);

  // Sobald irgendein Request auf der aktuellen Seite ein 401 (jwt expired) wirft
  if (response.status === 401) {
    console.warn("[SECURITY] Token abgelaufen. Erzwinge globalen Logout...");

    // 1. Radikaler Timer-Stopp: Killt sofort alle aktiven Intervalle und Timeouts
    let id = window.setTimeout(function() {}, 0);
    while (id--) { 
      window.clearInterval(id); 
      window.clearTimeout(id); 
    }

    // 2. Altes Token aus dem Browser-Speicher löschen
    localStorage.removeItem('appandor_jwt_token');

    // 3. Sofort hart zum Login wechseln
    window.location.href = '/login.html';
    
    throw new Error("Session expired");
  }

  return response;
};

// Zündet über das Signal der config.js
window.addEventListener("appandor_platform_ready", () => {
  initializeAppandorLayout();
  initializeAppandorSession();
});

// Alte Welt (Fallback): Zündet sofort, wenn die config.js auf der Seite fehlt
document.addEventListener("DOMContentLoaded", () => {
  if (!window.appConfig || Object.keys(window.appConfig).length === 0) {
    if (typeof initializeAppandorLayout === "function") initializeAppandorLayout();
    if (typeof initializeAppandorSession === "function") initializeAppandorSession();
  }
});

// ==========================================================================
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    
    // EINZELSCHRITT-SCHUTZSCHILD: Auf der Landingpage tut die alte core.js ab jetzt absolut gar nichts mehr!
    if (path.includes("lp.html") || path.includes("login.html" )) return;

    let pageKey = "title_dashboard";
    if (path.includes("index.html") || path === "/") pageKey = "lp_title";
    if (path.includes("login.html")) pageKey = "login_title";
    if (path.includes("inbound.html")) pageKey = "title_inbound";
    if (path.includes("outbound.html")) pageKey = "title_outbound";
    if (path.includes("products.html")) pageKey = "title_products";
    if (path.includes("settings.html")) pageKey = "title_settings";

    let currentLang = localStorage.getItem('appandor_lang') || navigator.language.slice(0, 2) || 'en';
    if (currentLang !== 'de' && currentLang !== 'en' && currentLang !== 'es') { currentLang = 'en'; }

    function renderLanguage(lang) {
        fetch(`lang/${lang}.json`)
            .then(res => { if (!res.ok) throw new Error("Language pack missing"); return res.json(); })
            .then(translations => {
                // 1. Übersetzt sichtbare Texte
                document.querySelectorAll("[data-i18n]").forEach(element => {
                    const key = element.getAttribute("data-i18n");
                    if (translations[key]) {
                        element.innerText = translations[key];
                    }
                });

                // 2. Übersetzt Platzhalter (Formulare)
                document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
                    const key = element.getAttribute("data-i18n-placeholder");
                    if (translations[key]) {
                        element.setAttribute("placeholder", translations[key]);
                    }
                });

                // 3. Übersetzt unsichtbare Tooltips (title-Attribute)
                document.querySelectorAll("[data-i18n-title]").forEach(element => {
                    const key = element.getAttribute("data-i18n-title");
                    if (translations[key]) {
                        element.setAttribute("title", translations[key]);
                    }
                });

                // Dynamische Titelzeile für den Browser-Tab patchen
                if (translations[pageKey]) {
                    const token = localStorage.getItem('appandor_jwt_token');
                    if (token && !path.includes("index.html") && !path.includes("login.html")) {
                        const tenantName = document.getElementById("tenant-name")?.innerText || "Workspace";
                        document.title = `${tenantName} — ${translations[pageKey]}`;
                    } else {
                        document.title = translations[pageKey];
                    }
                }

                const langSelector = document.getElementById("language-selector");
                if (langSelector) { 
                    // =========================================================================
                    // TODO: DEPRECATED (MIGRATION 2026)
                    // REMOVE THIS BLOCK AS SOON AS THIS PAGE IS FULLY MIGRATED TO CONFIG.JS!
                    // The new lang.js populates the selector automatically via manifest.
                    // =========================================================================
                    if (langSelector.options.length === 0) {
                        langSelector.innerHTML = '<option value="en">English</option><option value="de">Deutsch</option><option value="es">Español</option>';
                    }
                    // =========================================================================
                    
                    langSelector.value = lang; 
                }
                if (typeof startLiveCountdown === 'function') startLiveCountdown();

                window.dispatchEvent(new CustomEvent('appandor_language_changed', { detail: { lang: lang } }));
            })
            .catch(err => console.error("[i18n Core Error]:", err.message));
    }

    renderLanguage(currentLang);

    document.addEventListener("change", (e) => {
        if (e.target && e.target.id === "language-selector") {
            const selectedLang = e.target.value;
            localStorage.setItem('appandor_lang', selectedLang);
            renderLanguage(selectedLang);
        }
    });
});

    // UNIVERSAL: Schließt das geöffnete Modal Fenster per ESC-Taste (CRLF)
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" || e.key === "Esc") {
            const activeModal = document.getElementById("lay_modal-overlay");
            if (activeModal) activeModal.remove();
        }
    });

