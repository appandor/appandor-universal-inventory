// =============================================================================
// APPANDOR LOGISTICS: SESSION & AUTHENTICATION WARDEN (CRLF)
// =============================================================================

let countdownInterval = null;

// =============================================================================
// 1. UTILITIES & HELPERS (Kompakte Hilfsfunktionen)
// =============================================================================

(function initThemeEngine() {
    const savedTheme = localStorage.getItem('appandor_theme');
    if (savedTheme) {
        document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        const defaultTheme = prefersLight ? 'light' : 'dark';
        document.documentElement.setAttribute("data-theme", defaultTheme);
        localStorage.setItem('appandor_theme', defaultTheme);
    }
})();

function checkAndRefreshToken(response) {
    const refreshToken = response.headers.get('X-Refresh-Token');
    if (refreshToken) {
        localStorage.setItem('appandor_jwt_token', refreshToken);
        startLiveCountdown();
    }
    return response;
}

function parseJwt(token) {
    try {
        // KORREKTUR: Greift sich unbestechlich den zweiten Teil [1] (die Payload)
        const base64Url = token.split('.')[1];
        
        // Ersetzt URL-sichere Zeichen zurück in Standard-Base64, falls vorhanden
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        
        // Dekodiert den String und parst ihn als echtes JSON-Objekt
        return JSON.parse(atob(base64));
    } catch (e) {
        console.error("[parseJwt Error]:", e.message); // Hilft uns, Fehler sofort zu sehen
        return null;
    }
}

// =============================================================================
// 2. CORE SESSION LOGIC (Die scharfen Triebwerke)
// =============================================================================

function startLiveCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    
    // 1. ZUSTANDS-WECHSEL IM RAM: Setzt den i18n-Schlüssel
    window.appState.lay_connectionStatus = 'lay_status_connected';

    // 2. VISUELLER KASTEN-WECHSEL: Greift die ID und schaltet das CSS unbestechlich auf Grün
    const badge = document.getElementById("lay_connection_status");
    if (badge) {
        badge.setAttribute("data-state", "connected");
    }

    // 3. TIMER-ELEMENT-SCHRANKE (Gefahrenfrei nach dem Status-Wechsel platziert)
    const timerElement = document.getElementById("session-countdown-timer"); 
    if (!timerElement) return;


    let timeLeft = 0;     
    const token = localStorage.getItem('appandor_jwt_token');
    const decoded = parseJwt(token);   
    if (decoded && decoded.exp && decoded.iat) {
        timeLeft = decoded.exp - decoded.iat; 
    }
    countdownInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            localStorage.removeItem('appandor_jwt_token');
            window.location.href = "login.html";
            return;
        }

        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timeString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        timerElement.innerHTML = `· <span style="color: var(--success-color); font-weight: bold;">⏱ ${timeString}</span>`;
        timeLeft--;
    }, 1000);
}

function initializeAppandorSession() {
    const path = window.location.pathname;

    // REPARATUR: Befreit Impressum und Datenschutz unbestechlich von der Login-Schranke!
    if (
        path.includes("index.html") || 
        path.includes("login.html") || 
        path.includes("legal.html") ||
        path === "/"
    ) {
        return; // Überspringt die Token-Sperre für diese öffentlichen Seiten komplett!
    }    

    const token = localStorage.getItem('appandor_jwt_token');
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // UNBESTECHLICHE SERVER-ABFRAGE
    fetch('/api/auth/verify-session', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        checkAndRefreshToken(res);
        if (res.status === 401) throw new Error("Unauthorized");
        if (!res.ok) throw new Error("Server Error");
        return res.json();
    })
    .then(data => {
        // EISERNE SCHRANKE: Greift unbestechlich ERST HIER nach dem Server-Okay!
        if ((path.includes("settings.html") || path.includes("products.html")) && data.role === 'ROLE_WORKER') {
            alert(localStorage.getItem('appandor_lang') === 'de' 
                ? "Zutritt verweigert: Sie besitzen keine administrativen Rechte." 
                : "Access denied: Administrative privileges required.");
            window.location.href = "dashboard.html";
            return;
        }

        const tenantElement = document.getElementById("tenant-name");
        if (tenantElement) tenantElement.innerText = data.tenant_name;
        
        const userDisplay = document.getElementById("user-display-name");
        if (userDisplay) {
            const roleClean = data.role === 'ROLE_ADMIN' ? 'Admin' : 'Operator';
            userDisplay.innerText = `${data.email} [${roleClean}]`;
        }

        if (data.role === 'ROLE_ADMIN' || data.role === 'ROLE_SUPERADMIN') {
            const navList = document.getElementById("main-nav-list");
            if (navList && !document.getElementById("nav-link-settings")) {
                const li = document.createElement("li");
                const isDe = localStorage.getItem('appandor_lang') === 'de';
                const labelText = isDe ? 'Einstellungen' : 'Workspace Settings';
                const isActivePage = path.includes("settings.html") || path.includes("products.html");

                li.innerHTML = `<a href="settings.html" id="nav-link-settings" style="color: ${isActivePage ? 'var(--text-color)' : '#aaa'}; font-weight: ${isActivePage ? 'bold' : 'normal'}; text-decoration: none;" data-i18n="nav_settings">${labelText}</a>`;
                navList.appendChild(li);
            }
        }

        startLiveCountdown();
    })
    .catch(error => {
        localStorage.removeItem('appandor_jwt_token');
        window.location.href = "login.html";
    });
};

// =============================================================================
// 3. Globaler Export für das System
// =============================================================================

window.startLiveCountdown = startLiveCountdown;

// =============================================================================
// 4. SYSTEM TRIGGERS & LISTENERS (Alle Wächter sauber unten gebündelt)
// =============================================================================

window.addEventListener('appandor_language_changed', () => {
  if (typeof startLiveCountdown === 'function') {
    startLiveCountdown();
  }
});