window.appTranslations = {};

window.translatePage = function() {
  const translations = window.appTranslations || {};
    
  // 1. Statische Texte ersetzen
  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.getAttribute("data-i18n");
    if (translations[key]) {
      element.innerText = translations[key];
    } else {
      // erzwingen wir den rohen #platzhalter#, anstatt den alten Text stehenzulassen!
      element.innerText = `#${key}#`;
    }
  });
    
    // 2. KORREKTUR: Dynamischer Aufbau des Selectors NUR WENN ER EXISITIERT!
    const langSelector = document.getElementById("language-selector");
    if (langSelector) {
        const supportedLangs = window.appConfig.supported_languages || ['en'];
        const currentActive = localStorage.getItem('appandor_lang') || window.appConfig.default_language || 'en';
        let dropdownHTML = '';
        
        supportedLangs.forEach(langCode => {
            const localizedName = translations[`lang_${langCode}`] || `#lang_${langCode}#`;
            dropdownHTML += `<option value="${langCode}">${localizedName}</option>`;
        });
        
        langSelector.innerHTML = dropdownHTML;
        langSelector.value = currentActive;
    }
    console.log("[lang.js]: Seiten-Texte synchronisiert.");
};

window.changeLanguage = function(lang) {
    const supportedLangs = window.appConfig.supported_languages || ['en'];
    if (!supportedLangs.includes(lang)) { lang = 'en'; }
    
    localStorage.setItem('appandor_lang', lang);

    fetch(`lang/${lang}.json`)
        .then(res => { 
            if (!res.ok) return {}; 
            return res.json();
        })
        .then(translations => {
            window.appTranslations = translations || {};
            window.translatePage();
            window.dispatchEvent(new CustomEvent('appandor_language_changed', { detail: { lang: lang } }));
        })
        .catch(err => {
            console.error("[lang.js Error]:", err.message);
            window.appTranslations = {};
            window.translatePage();
        });
};


// Startet sofort beim Laden der Datei über die config.js
let currentLang = localStorage.getItem('appandor_lang') || 'en';
window.changeLanguage(currentLang);

// Globaler Wächter für das Dropdown, sobald es geladen wurde
document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "language-selector") {
        window.changeLanguage(e.target.value);
    }
});
