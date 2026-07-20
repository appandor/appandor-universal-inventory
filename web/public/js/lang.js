window.appTranslations = {};

window.translatePage = function() {
  const translations = window.appTranslations || {};

  // 1. Statische Texte ersetzen (entweder aus i18n oder aus variable falls i18n-val existiert)
  // 2. Tooltip Texte übersetzen
  document.querySelectorAll("[data-i18n], [data-i18n-val], [data-i18n-title]").forEach(element => {
  
    let key = element.getAttribute("data-i18n"); // Kann existieren, muss aber nicht
    
    if (element.hasAttribute('data-i18n-val')) {
      const stateVariable = element.getAttribute('data-i18n-val'); // z.B. "lay_connectionStatus"
      if (stateVariable && window.appState && window.appState[stateVariable]) {
        key = window.appState[stateVariable]; // Holt z.B. "lay_status_connecting"
        element.setAttribute("data-state", key);
      }
    }
    
    if (key) {
      if (translations && translations[key]) {
        element.innerText = translations[key];
      } else {
        element.innerText = `#${key}#`; // Sichtbarer Alarm bei fehlendem JSON-Eintrag
      }
    }

    if (element.hasAttribute("data-i18n-title")) {
      const titleKey = element.getAttribute("data-i18n-title"); // z.B. "lay_connectionStatus_tooltip"
      
      if (translations && translations[titleKey]) {
        element.setAttribute("title", translations[titleKey]);
      } else {
        element.setAttribute("title", `#${titleKey}#`); // Sichtbarer Alarm im Tooltip
      }
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
    console.log("[lang.js]: Page texts synchronized.");
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
