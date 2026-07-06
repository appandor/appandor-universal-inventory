document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    if (path.includes("index.html") || path.includes("login.html") || path === "/") return;

    const headerContainer = document.getElementById("appandor-header");
    if (!headerContainer) return;

    const token = localStorage.getItem('appandor_jwt_token');
    let userRole = 'ROLE_WORKER';
    
    try {
        if (token) {
            const decoded = JSON.parse(atob(token.split('.')[1]));
            userRole = decoded.role || 'ROLE_WORKER';
        }
    } catch (e) {}

    const settingsMenuHTML = (userRole === 'ROLE_ADMIN' || userRole === 'ROLE_SUPERADMIN')
        ? `<li><a href="settings.html" id="nav-link-settings" style="color: #aaa; text-decoration: none;" data-i18n="nav_settings">Workspace Settings</a></li>`
        : '';

    const currentTheme = localStorage.getItem('appandor_theme') || 'dark';
    const themeLabelKey = currentTheme === 'dark' ? 'theme_light' : 'theme_dark';

    // 1. DYNAMISCHEN HEADER UND NAVIGATION BAUEN
    headerContainer.innerHTML = `
        <header style="display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 15px;">
                <img src="app_images/logo.jpg" alt="Logo" id="header-logo" onerror="this.style.display='none';" style="height: 35px; width: auto; border-radius: 4px; display: block;">
                <div>
                    <h1 style="font-size: 24px; margin: 0; display: flex; align-items: center;">
                        <span id="tenant-name">Loading Workspace</span>
                    </h1>
                    <p style="font-size: 12px; color: var(--text-muted); margin: 0; margin-top: 3px; font-family: monospace; display: flex; align-items: center; gap: 6px;">
                        <span id="user-display-name">Identität...</span>
                        <span id="session-countdown-timer"></span>
                    </p>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 20px;">
                <span id="theme-toggle-text" data-i18n="${themeLabelKey}" style="font-size: 12px; font-weight: bold; cursor: pointer; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; user-select: none; transition: color 0.2s;"></span>
                
                <select id="language-selector" style="background: var(--card-bg); color: var(--text-color); border: 1px solid var(--border-color); padding: 5px 10px; border-radius: 4px; font-weight: bold; cursor: pointer;">
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                    <option value="es">Español</option>
                </select>
                
                <div id="connection-status" class="status-badge" data-i18n="status_connecting" data-i18n-title="tooltip_logout" style="cursor: pointer; transition: opacity 0.2s;"></div>
            </div>
        </header>

        <nav style="margin: 20px 0; padding: 10px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 6px;">
            <ul id="main-nav-list" style="list-style: none; display: flex; gap: 20px; margin: 0; padding: 0;">
                <li><a href="inbound.html" id="nav-link-inbound" style="color: #aaa; text-decoration: none;" data-i18n="nav_inbound">Goods Inbound</a></li>
                <li><a href="outbound.html" id="nav-link-outbound" style="color: #aaa; text-decoration: none;" data-i18n="nav_outbound">Goods Outbound</a></li>
                <li><a href="dashboard.html" id="nav-link-dashboard" style="color: #aaa; text-decoration: none;" data-i18n="nav_inventory">Live Inventory</a></li>
                ${settingsMenuHTML}
                <li><a href="legal.html" id="nav-link-legal" style="color: #aaa; text-decoration: none;" data-i18n="nav_legal">Legal / Info</a></li>
            </ul>
        </nav>
    `;

    // 2. AKTIVEN REITER OPTISCH HERVORHEBEN (KORREKTUR: Bleibt auch bei Unterseiten aktiv!)
    if (path.includes("dashboard.html")) {
        const el = document.getElementById("nav-link-dashboard");
        if (el) { el.style.color = "var(--text-color)"; el.style.fontWeight = "bold"; }
    } else if (path.includes("inbound.html")) {
        const el = document.getElementById("nav-link-inbound");
        if (el) { el.style.color = "var(--text-color)"; el.style.fontWeight = "bold"; }
    } else if (path.includes("outbound.html")) {
        const el = document.getElementById("nav-link-outbound");
        if (el) { el.style.color = "var(--text-color)"; el.style.fontWeight = "bold"; }
    } else if (path.includes("settings.html") || path.includes("products.html")) {
        // KORREKTUR: Wenn wir in den Stammdaten sind, bleibt "Einstellungen" fett verankert!
        const el = document.getElementById("nav-link-settings");
        if (el) { el.style.color = "var(--text-color)"; el.style.fontWeight = "bold"; }
    } else if (path.includes("legal.html")) {
        const el = document.getElementById("nav-link-legal");
        if (el) { el.style.color = "var(--text-color)"; el.style.fontWeight = "bold"; }
    }


    // 3. SCHARFER TRIGGGER FÜR DIE CORES.JS (KORREKTUR: Zwingt core.js zum sofortigen Übersetzen des frischen Headers!)
    const activeLang = localStorage.getItem('appandor_lang') || 'en';
    const langSelector = document.getElementById("language-selector");
    if (langSelector) {
        langSelector.value = activeLang;
        // Löst das 'change' Event aus, damit core.js die Übersetzungen sofort einpflegt
        setTimeout(() => langSelector.dispatchEvent(new Event('change')), 10);
    }

    // 4. THEME-UMSCHALTER MIT DYNAMISCHER i18n ANBINDUNG
    const themeBtn = document.getElementById("theme-toggle-text");
    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            const activeTheme = document.documentElement.getAttribute("data-theme") || "dark";
            const newTheme = activeTheme === "dark" ? "light" : "dark";
            
            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem('appandor_theme', newTheme);
            
            const nextLabelKey = newTheme === "dark" ? "theme_light" : "theme_dark";
            themeBtn.setAttribute("data-i18n", nextLabelKey);

            // KORREKTUR: Liest die Sprache JETZT live beim Klick aus, statt starr beim Laden!
            const liveLang = localStorage.getItem('appandor_lang') || 'en';
            
            fetch(`lang/${liveLang}.json`)
                .then(r => r.json())
                .then(t => {
                    themeBtn.innerText = t[nextLabelKey] || nextLabelKey;
                    // Erzwingt eine komplette Neuübersetzung der Seite, damit kein Text auf Englisch zurückfällt
                    if (langSelector) langSelector.dispatchEvent(new Event('change'));
                })
                .catch(err => console.error("[Theme Lang Fetch Error]:", err.message));
        });
    }

    // 5. ABMELDUNG (LOGOUT) WITH CUSTOM BEAUTIFUL MODAL
    const badgeElement = document.getElementById("connection-status");


    if (badgeElement) {
        badgeElement.addEventListener("click", () => {
            const liveLang = localStorage.getItem('appandor_lang') || 'en';
            
            fetch(`lang/${liveLang}.json`)
                .then(r => r.json())
                .then(t => {
                    const logoutMsg = t["msg_logout_confirm"] || "Do you really want to sign out?";
                    
                    // KORREKTUR: Nutzt jetzt deine zentralen, existierenden JSON-Schlüssel!
                    const btnYes = t["btn_modal_confirm"] || (liveLang === 'es' ? 'Confirmar' : 'Confirm');
                    const btnNo = t["btn_modal_cancel"] || (liveLang === 'es' ? 'Cancelar' : 'Cancel');

                    // KORREKTUR: Nutzt jetzt das universelle, per ESC schließbare CSS-Overlay
                    const modalOverlay = document.createElement("div");
                    modalOverlay.id = "custom-logout-modal";
                    modalOverlay.className = "appandor-modal-overlay"; 

                    // KORREKTUR: Befreit von Inline-Styles, nutzt Klassen & repariert den Text-Kontrast!
                    modalOverlay.innerHTML = `
                        <div class="appandor-modal-box" style="max-width: 400px; text-align: center;">
                            <p style="color: var(--text-color); font-size: 16px; font-weight: bold; margin: 0 0 25px 0;">${logoutMsg}</p>
                            <div style="display: flex; justify-content: center; gap: 15px;">
                                <button id="modal-confirm-no" style="padding: 10px 20px; background: var(--input-bg); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 4px; font-weight: bold; cursor: pointer;">
                                    ${btnNo}
                                </button>
                                <button id="modal-confirm-yes" style="padding: 10px 20px; background: #c62828; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; transition: background 0.2s;">
                                    ${btnYes}
                                </button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modalOverlay);

                    document.getElementById("modal-confirm-yes").addEventListener("click", () => {
                        localStorage.removeItem('appandor_jwt_token');
                        window.location.href = "index.html";
                    });

                    document.getElementById("modal-confirm-no").addEventListener("click", () => {
                        modalOverlay.remove();
                    });
                });
        });
        badgeElement.addEventListener("mouseover", () => badgeElement.style.opacity = "0.8");
        badgeElement.addEventListener("mouseout", () => badgeElement.style.opacity = "1.0");
    }

    // UNIVERSAL: Schließt JEDES geöffnete Appandor-Modal im System per ESC-Taste
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" || e.key === "Esc") {
            // Findet alle aktiven Modale über die universelle Overlay-Klasse
            const activeModals = document.querySelectorAll(".appandor-modal-overlay");
            activeModals.forEach(modal => modal.remove());
        }
    });
    
});
