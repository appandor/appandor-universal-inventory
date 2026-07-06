let countdownInterval = null;

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
        return JSON.parse(atob(token.split('.')));
    } catch (e) {
        return null;
    }
}

// SCHARFE COUNTDOWN-SCHLEIFE
function startLiveCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    
    const badge = document.getElementById("connection-status");
    const timerElement = document.getElementById("session-countdown-timer");
    
    if (!badge || !timerElement) return;

    const token = localStorage.getItem('appandor_jwt_token');
    const decoded = parseJwt(token);
    
    const currentLang = localStorage.getItem('appandor_lang') || 'en';
    
    let statusText = "Connected";
    if (currentLang === 'de') statusText = "VERBUNDEN";
    if (currentLang === 'es') statusText = "CONECTADO";
    
    badge.innerText = statusText;
    
    let timeLeft = 3600; 
    if (decoded && decoded.exp) {
        const now = Math.floor(Date.now() / 1000);
        const calculatedTime = decoded.exp - now;
        if (calculatedTime > 0) {
            timeLeft = calculatedTime;
        }
    }

    countdownInterval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
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

window.startLiveCountdown = startLiveCountdown;

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    if (path.includes("index.html") || path.includes("login.html") || path === "/") return;

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
});
