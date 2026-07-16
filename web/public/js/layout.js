
// =============================================================================
// APPANDOR LOGISTICS: CORE PLATFORM INITIALIZATION CHORD (CRLF)
// =============================================================================

// UI-MANAGER: Wartet auf das Signal der asynchronen Seiten wenn sie fertig sind
window.addEventListener("appandor_render_complete", () => {

  if (typeof window.translatePage === "function") {    
    window.translatePage();
    const container = document.querySelector(".lay_container");
    if (container) container.classList.add("lay_visible");
  }

  // =============================================================================
  // GLOBAL PLATFORM COLLAPSE WATCHER (100% KONSOLIDIERT FÜR ALLE LAYOUT-MODULE)
  // =============================================================================
  // Horcht reinrassig auf die universelle Framework-Klasse oder die Kern-ID
  const activeToggleHeader = document.querySelector(".lay_toggle-header") || 
                             document.getElementById("lay_toggle-header");

  if (activeToggleHeader) {
    activeToggleHeader.addEventListener("click", () => {
      // 1. Holt die direkt umschließende Framework-Karte
      const card = activeToggleHeader.closest('.card');
      if (!card) return;

      // 2. Findet das Formular und den Button über die reinen Framework-Bezeichner
      const form = card.querySelector('.lay_form-grid') || card.querySelector('form');
      const btn = activeToggleHeader.querySelector('.lay_toggle-btn') || 
                  activeToggleHeader.querySelector('span') ||
                  document.getElementById("lay_toggle-btn");

      if (!form || !btn) return;

      // 3. Der unbestechliche Toggle über den data-state der Karte
      if (card.getAttribute("data-state") === "collapsed") {
        card.removeAttribute("data-state");
        form.style.display = "flex";
        btn.setAttribute("data-i18n", "btn_collapse");
        btn.removeAttribute("data-state");
      } else {
        card.setAttribute("data-state", "collapsed");
        form.style.display = "none";
        btn.setAttribute("data-i18n", "btn_expand");
        btn.setAttribute("data-state", "collapsed");
      }

      // Zündet die i18n-Übersetzung für den veränderten Button-Zustand (Pfeil-Switch)
      if (typeof window.translatePage === "function") window.translatePage();
    });
  }

});


function initializeAppandorLayout() {
  
  const path = window.location.pathname;
  
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
    ? `<li><a href="settings.html" id="nav-link-settings" style="color: #aaa; text-decoration: none;" data-i18n="lay_nav_settings"></a></li>`
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
          <select id="language-selector" style="background: var(--card-bg); color: var(--text-color); border: 1px solid var(--border-color); padding: 5px 10px; border-radius: 4px; font-weight: bold; cursor: pointer;"></select>

          <div id="lay_connection-status" 
              data-i18n-val="lay_connectionStatus" 
              data-i18n-title="lay_connectionStatus_tooltip"TEST>
          </div>

      </div>
    </header>
    <nav style="margin: 20px 0; padding: 10px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 6px;">
      <ul id="main-nav-list" style="list-style: none; display: flex; gap: 20px; margin: 0; padding: 0;">
        <li><a href="inventory.html" id="nav-link-inventory" style="color: #aaa; text-decoration: none;" data-i18n="lay_nav_inventory"></a></li>
        <li><a href="inbound.html" id="nav-link-inbound" style="color: #aaa; text-decoration: none;" data-i18n="lay_nav_inbound"></a></li>
        <li><a href="outbound.html" id="nav-link-outbound" style="color: #aaa; text-decoration: none;" data-i18n="lay_nav_outbound"></a></li>
        ${settingsMenuHTML}
        <li><a href="admin.html" id="nav-link-admin" style="color: #aaa; text-decoration: none;" data-i18n="lay_nav_admin"></a></li>
        <li><a href="legal.html" id="nav-link-legal" style="color: #aaa; text-decoration: none;" data-i18n="lay_nav_legal"></a></li>
      </ul>
    </nav>
  `;

  // 2. AKTIVEN REITER OPTISCH HERVORHEBEN
  const currentPage = window.location.pathname.split("/").pop().replace(".html", ""); 
  const activeEl = document.getElementById(`nav-link-${currentPage}`);
  if (activeEl) {
    activeEl.style.color = "var(--text-color)";
    activeEl.style.fontWeight = "bold";
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

  // 5. ABMELDUNG (LOGOUT) WITH CUSTOM BEAUTIFUL MODAL (CRLF)
  const badgeElement = document.getElementById("lay_connection-status");

  if (badgeElement) {
      badgeElement.addEventListener("click", () => {
          const liveLang = localStorage.getItem('appandor_lang') || 'en';
          
          fetch(`lang/${liveLang}.json`)
              .then(r => r.json())
              .then(t => {
                  const logoutMsg = t["msg_logout_confirm"] || "Do you really want to sign out?";
                  
                  const btnYes = t["btn_modal_confirm"] || (liveLang === 'es' ? 'Confirmar' : 'Confirm');
                  const btnNo = t["btn_modal_cancel"] || (liveLang === 'es' ? 'Cancelar' : 'Cancel');

                  const modalOverlay = document.createElement("div");
                  modalOverlay.id = "lay_modal-overlay"; 

                  // KONVENTIONS-ANPASSUNG: Nutzt jetzt deine neue Klasse "lay_modal-box"
                  modalOverlay.innerHTML = `
                      <div class="lay_modal-box" style="max-width: 400px; text-align: center;">
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
                      window.location.href = "/";
                  });

                  document.getElementById("modal-confirm-no").addEventListener("click", () => {
                      modalOverlay.remove();
                  });
              });
      });
      // UNBESTECHLICHE REINIGUNG: Die alten mouseover/mouseout EventListener wurden entfernt.
      // Das regelt ab jetzt die layout.css vollautomatisch und flüssiger über #lay_connection-status:hover!
  }

  if (typeof window.translatePage === 'function') {
    window.translatePage();
  }

};