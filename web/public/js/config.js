// =============================================================================
// APPANDOR LOGISTICS: CENTRAL APP CONFIGURATOR
// =============================================================================

// Globale System-Konfiguration im RAM deklarieren
window.appConfig = {};
window.appState = {
  lay_connectionStatus: 'lay_status_connecting'
};

(function() {
    // Die exakte Kette der Kern-Skripte, die nacheinander geladen werden MÜSSEN
    const CORE_SCRIPTS = [
        "js/lang.js",      // 1. i18n Engine & RAM-Vorbereitung
        "js/session.js",   // 2. JWT & Mandanten-Sicherheitscheck
        "js/core.js",      // 3. Globale Seiten-Logik und Pfad-Erkennung
        "js/layout.js"     // 4. Header-Injektion und Menü-Struktur
    ];

    // Hilfsfunktion, die ein Skript lädt und ein Promise zurückgibt
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = false; // Erzwingt die strikte Einhaltung der Reihenfolge im Browser
            script.onload = () => {
                console.log(`[config.js]: '${src}' erfolgreich geladen.`);
                resolve();
            };
            script.onerror = () => reject(new Error(`Fehler beim Laden des Skripts: ${src}`));
            document.head.appendChild(script);
        });
    }

    // Die serielle Ladekette (skript_1 -> skript_2 -> skript_3...)
    function loadScriptsSerially(scripts) {
        return scripts.reduce((promise, scriptSrc) => {
            return promise.then(() => loadScript(scriptSrc));
        }, Promise.resolve());
    }

    console.log("[config.js]: Initialisiere...");

    // 1. ZUERST: Manifest von der obersten Ebene abrufen
    fetch("manifest.json")
        .then(res => {
            if (!res.ok) throw new Error("Zentrales App-Manifest fehlt oder ist korrupt.");
            return res.json();
        })
        .then(manifest => {
            // Manifest unzerstörbar im RAM verankern
            window.appConfig = manifest;
            console.log("[config.js]: Manifest erfolgreich deklariert.", window.appConfig);

            // 2. DANACH: Alle Kern-Skripte in exakter Reihenfolge nachladen
            return loadScriptsSerially(CORE_SCRIPTS);
        })
        .then(() => {
            console.log("[config.js]: Gesamtes Core-System einsatzbereit. Sende Startsignal...");
            // 3. SCHLUSSZEICHEN: Globales Event werfen, damit Render-Worker starten dürfen
            window.dispatchEvent(new CustomEvent("appandor_platform_ready"));
        })
        .catch(err => {
            console.error("[config.js Fatal Error]: Kern-System konnte nicht geladen werden:", err.message);
        });
})();
