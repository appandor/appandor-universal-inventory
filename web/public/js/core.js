document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    
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
                if (langSelector) { langSelector.value = lang; }

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
