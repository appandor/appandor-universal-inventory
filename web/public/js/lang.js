// Zentrale Definition aller gültigen Sprachen
const SUPPORTED_LANGUAGES = ['de', 'en', 'es'];

window.appTranslations = {};

// Ersetzt alle data-i18n Elemente auf einer Seite
window.translatePage = function() {
    const translations = window.appTranslations || {};
    
    document.querySelectorAll("[data-i18n]").forEach(element => {
        const key = element.getAttribute("data-i18n");
        if (translations[key]) {
            element.innerText = translations[key];
        }
    });
    
    // Dynamischer Aufbau des Language-Selectors
    const langSelector = document.getElementById("language-selector");
    if (langSelector) {
        const currentActive = localStorage.getItem('appandor_lang') || 'en';
        let dropdownHTML = '';
        
        SUPPORTED_LANGUAGES.forEach(langCode => {
            const localizedName = translations[`lang_${langCode}`] || `#lang_${langCode}#`;
            dropdownHTML += `<option value="${langCode}">${localizedName}</option>`;
        });
        
        langSelector.innerHTML = dropdownHTML;
        langSelector.value = currentActive;
    }
};

// Zentrale Funktion für den Sprachwechsel
window.changeLanguage = function(lang) {

    if (!SUPPORTED_LANGUAGES.includes(lang)) { 
        lang = 'en'; 
    }    
    localStorage.setItem('appandor_lang', lang);

    fetch(`lang/${lang}.json`)
        .then(res => { 
            if (!res.ok) {
                console.warn(`[i18n Core Warning]: Language file '${lang}.json' missing.`);
                return {}; 
            }
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                return res.json();
            }
            return {};
        })
        .then(translations => {
            window.appTranslations = translations || {};
            window.translatePage();
            window.dispatchEvent(new CustomEvent('appandor_language_changed', { detail: { lang: lang } }));
        })
        .catch(err => {
            console.error("[i18n Core Error]:", err.message);
            window.appTranslations = {};
            window.translatePage();
            window.dispatchEvent(new CustomEvent('appandor_language_changed', { detail: { lang: lang } }));
        });
};

document.addEventListener("DOMContentLoaded", () => {
    let currentLang = localStorage.getItem('appandor_lang') || navigator.language.slice(0, 2) || 'en';
    
    window.changeLanguage(currentLang);

    document.addEventListener("change", (e) => {
        if (e.target && e.target.id === "language-selector") {
            window.changeLanguage(e.target.value);
        }
    });
});
