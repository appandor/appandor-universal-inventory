document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    if (path.includes("index.html") || path.includes("login.html") || path === "/") return;

    const headerContainer = document.getElementById("appandor-header");
    if (!headerContainer) return;

    const token = localStorage.getItem('appandor_jwt_token');
    let userRole = 'ROLE_WORKER';
    
    try {
        if (token) {
            const decoded = JSON.parse(atob(token.split('.')));
            userRole = decoded.role || 'ROLE_WORKER';
        }
    } catch (e) {}

    const settingsMenuHTML = (userRole === 'ROLE_ADMIN' || userRole === 'ROLE_SUPERADMIN')
        ? `<li><a href="settings.html" id="nav-link-settings" style="color: #aaa; text-decoration: none;" data-i18n="nav_settings">Workspace Settings</a></li>`
        : '';

    const currentTheme = localStorage.getItem('appandor_theme') || 'dark';
    const themeLabelKey = currentTheme === 'dark' ? 'theme_light' : 'theme_dark';
    
    // ABSOLUTE FIXIERUNG: Variable wird deklariert, damit Zeile 99 nicht abstürzt!
    const currentLang = localStorage.getItem('appandor_lang') || 'en';

    headerContainer.innerHTML = `
        <header style="display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 15px;">
                <img src="app_images/logo.jpg" alt="Logo" id="header-logo" onerror="this.style.display='none';" style="height: 35px; width: auto; border-radius: 4px; display: block;">
                <div>
                    <h1 style="font-size: 24px; margin: 0; display: flex; align-items: center;">
                        <span id="tenant-name">Loading Workspace</span>
                    </h1>
                    <!-- KORREKTUR: Zwei vollkommen getrennte, unzerstörbare Daten-Anker im Flex-Gefüge -->
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
                
                <!-- UNZERSTÖRBAR: data-i18n-title hinzugefügt für absolut saubere, übersetzbare Tooltips in allen Sprachen! -->
                <div id="connection-status" class="status-badge" data-i18n="status_connecting" data-i18n-title="tooltip_logout" style="cursor: pointer; transition: opacity 0.2s;"></div>
            </div>
        </header>

        <nav style="margin: 20px 0; padding: 10px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 6px;">
            <ul id="main-nav-list" style="list-style: none; display: flex; gap: 20px; margin: 0; padding: 0;">
                <li><a href="inbound.html" id="nav-link-inbound" style="color: #aaa; text-decoration: none;" data-i18n="nav_inbound">Wareneingang</a></li>
                <li><a href="outbound.html" id="nav-link-outbound" style="color: #aaa; text-decoration: none;" data-i18n="nav_outbound">Warenausgang</a></li>
                <li><a href="dashboard.html" id="nav-link-dashboard" style="color: #aaa; text-decoration: none;" data-i18n="nav_inventory">Warenbestand</a></li>
            </ul>
        </nav>
    `;

    if (path.includes("dashboard.html")) {
        const el = document.getElementById("nav-link-dashboard");
        if (el) { el.style.color = "var(--text-color)"; el.style.fontWeight = "bold"; }
    } else if (path.includes("inbound.html")) {
        const el = document.getElementById("nav-link-inbound");
        if (el) { el.style.color = "var(--text-color)"; el.style.fontWeight = "bold"; }
    } else if (path.includes("outbound.html")) {
        const el = document.getElementById("nav-link-outbound");
        if (el) { el.style.color = "var(--text-color)"; el.style.fontWeight = "bold"; }
    }

    const themeBtn = document.getElementById("theme-toggle-text");
    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            const activeTheme = document.documentElement.getAttribute("data-theme") || "dark";
            const newTheme = activeTheme === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem('appandor_theme', newTheme);
            const nextLabelKey = newTheme === "dark" ? "theme_light" : "theme_dark";
            themeBtn.setAttribute("data-i18n", nextLabelKey);
            fetch(`lang/${currentLang}.json`).then(r => r.json()).then(t => {
                themeBtn.innerText = t[nextLabelKey] || nextLabelKey;
            });
        });
    }

    const badgeElement = document.getElementById("connection-status");
    if (badgeElement) {
        badgeElement.addEventListener("click", () => {
            const confirmLogout = confirm(localStorage.getItem('appandor_lang') === 'de' ? 'Möchten Sie sich wirklich abmelden?' : 'Do you really want to sign out?');
            if (confirmLogout) {
                localStorage.removeItem('appandor_jwt_token');
                window.location.href = "login.html";
            }
        });
        badgeElement.addEventListener("mouseover", () => badgeElement.style.opacity = "0.8");
        badgeElement.addEventListener("mouseout", () => badgeElement.style.opacity = "1.0");
    }
});
