// =============================================================================
// APPANDOR LOGISTICS: MODULE - SYSTEM LOGS WORKER (CRLF)
// =============================================================================

window.adminLogIntervalId = null;
window.adminLogCountdownId = null; 
window.currentRawLogs = ""; // Zwischenspeicher für den ungefilterten Original-Text

function fetchTerminalStreams(limitValue) {
  const terminal = document.getElementById("admin-log-terminal");
  const filterInput = document.getElementById("admin-log-search-input");
  const token = localStorage.getItem('appandor_jwt_token');
  if (!terminal) return;

  fetch(`/api/admin/logs?limit=${limitValue}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => {
    if (!res.ok) throw new Error("Verbindung zur Log-Pipeline fehlgeschlagen");
    return res.json();
  })
  .then(data => {
    if (data && data.logs) {
      window.currentRawLogs = data.logs; // Sichert die Original-Daten
      console.log(data.logs.split('\n').length);

      // Wendet den aktuellen Filterwert an (falls der Admin schon Text eingetippt hat)
      applyLogFilter(filterInput ? filterInput.value : "");
    } else {
      window.currentRawLogs = "";
      terminal.innerHTML = `<span style="color: #ffff00;">[System]: Keine Protokolleinträge gefunden.</span>`;
    }
  })
  .catch(err => {
    terminal.style.color = "#ff3333";
    terminal.innerText = `[SYSTEM ERROR]: ${err.message}\nProtokoll-Streaming abgebrochen.`;
  });
}

// Verarbeitet und filtert die Zeilen im Browser-RAM
function applyLogFilter(keyword) {
  const terminal = document.getElementById("admin-log-terminal");
  if (!terminal || !window.currentRawLogs) return;

  terminal.style.color = ""; 
  const lines = window.currentRawLogs.split('\n');
  const searchWord = keyword.toLowerCase().trim();

  const formattedLines = lines.map(line => {
    if (!line.trim()) return ""; 

    // Wenn ein Suchbegriff eingegeben wurde, überspringen wir Zeilen, die ihn nicht enthalten
    if (searchWord && !line.toLowerCase().includes(searchWord)) {
      return null; 
    }

    let color = "#ffffff"; 
    if (line.includes("[INFO]"))   color = "#00ff00"; 
    if (line.includes("[ERROR]"))  color = "#ff3333"; 
    if (line.includes("[ATTACK]")) color = "#ff00ff"; 
    if (line.includes("[INFO]") && !line.includes("[HTTP]")) color = "#00ffff";
    if (line.includes("[HTTP] HEAD")) color = "#ffeeaa";    
    if (line.includes("Status: 404") && !line.includes("[ATTACK]")) color = "#e0a065"; 

    return `<span style="color: ${color}; font-family: inherit;">${line}</span>`;
  });

  // Filtert leere (null) Einträge heraus und fügt den Rest zusammen
  const finalHtml = formattedLines.filter(line => line !== null).join('\n');

  if (finalHtml.trim() === "") {
    terminal.innerHTML = `<span style="color: #ffaa00;">[Filter]: Keine Einträge für "${keyword}" gefunden.</span>`;
  } else {
    terminal.innerHTML = finalHtml;
    // Automatisch nach unten scrollen zu den neuesten Ergebnissen
    const container = terminal.parentElement;
    if (container) container.scrollTop = container.scrollHeight;
  }
}

function startVisualCountdown(seconds) {
  const indicator = document.getElementById("admin-log-timer-indicator");
  const circle = document.getElementById("admin-log-timer-circle");
  const textNode = document.getElementById("admin-log-timer-text");
  
  if (window.adminLogCountdownId) clearInterval(window.adminLogCountdownId);
  if (!indicator || !circle || !textNode) return;

  if (seconds === 0) {
    indicator.style.visibility = "hidden";
    return;
  }

  indicator.style.visibility = "visible";
  let timeLeft = seconds;
  const totalLength = 2 * Math.PI * 18;

  circle.style.strokeDasharray = totalLength;
  circle.style.strokeDashoffset = totalLength;
  textNode.textContent = timeLeft;

  window.adminLogCountdownId = setInterval(() => {
    timeLeft--;
    textNode.textContent = timeLeft;

    const percentDone = (seconds - timeLeft) / seconds;
    const offset = totalLength - (percentDone * totalLength);
    circle.style.strokeDashoffset = offset;

    if (timeLeft <= 0) {
      timeLeft = seconds;
      textNode.textContent = timeLeft;
      circle.style.strokeDashoffset = totalLength;
    }
  }, 1000);
}

function setupRefreshTimer(limitValue, seconds) {
  if (window.adminLogIntervalId) clearInterval(window.adminLogIntervalId);
  startVisualCountdown(seconds);
  if (seconds === 0) return;

  window.adminLogIntervalId = setInterval(() => {
    fetchTerminalStreams(limitValue);
  }, seconds * 1000);
}

window.initAdminLogs = function() {
  const mainContainer = document.getElementById("container");
  if (!mainContainer) return;

  mainContainer.innerHTML = `
    <div id="admin-log-control-zone" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; width: 100%; gap: 15px;">
      
      <!-- Linker Block: Einstellungen und Controls -->
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <!-- Zeilen-Limit -->
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          <span style="font-weight: bold; font-size: 13px; color: #333333;">Zeilen-Limit:</span>
          <select id="admin-log-limit-select" class="lay_input-select" style="width: 80px; height: 32px; padding: 0 5px; box-sizing: border-box;">
            <option value="100">100</option>
            <option value="500">500</option>
            <option value="1000">1000</option>
          </select>
        </div>

        <!-- Auto-Refresh -->
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          <span style="font-weight: bold; font-size: 13px; color: #333333;">Auto-Refresh:</span>
          <select id="admin-log-refresh-select" class="lay_input-select" style="width: 130px; height: 32px; padding: 0 5px; box-sizing: border-box;">
            <option value="0">Aus (Manuell)</option>
            <option value="60">60 Sekunden</option>
            <option value="120">120 Sekunden</option>
            <option value="180">180 Sekunden</option>
          </select>
        </div>

        <!-- Manueller Refresh-Button -->
        <button id="admin-log-manual-refresh" style="padding: 0 15px; background: #222222; color: #ffffff; border: 1px solid #444444; border-radius: 4px; font-family: inherit; font-size: 13px; font-weight: bold; cursor: pointer; height: 32px; flex-shrink: 0; transition: background 0.2s; box-sizing: border-box;">
          Refresh
        </button>
      </div>

      <!-- Rechter Block: Feste Kombination aus Timer und Filter -->
      <div style="display: flex; align-items: center; gap: 10px; max-width: 370px; width: 100%; justify-content: flex-end; flex-shrink: 0;">
        
        <!-- Timer-Indikator (Belegt jetzt IMMER Platz über visibility) -->
        <div id="admin-log-timer-indicator" style="visibility: hidden; display: flex; align-items: center; justify-content: center; height: 32px; width: 32px; flex-shrink: 0;">
          <svg width="34" height="34" style="overflow: visible;">
            <g style="transform: rotate(-90deg); transform-origin: 17px 17px;">
              <circle cx="17" cy="17" r="15" stroke="#e1e1e1" stroke-width="2.5" fill="transparent" />
              <circle id="admin-log-timer-circle" cx="17" cy="17" r="15" stroke="#00ff00" stroke-width="2.5" fill="transparent" 
                style="transition: stroke-dashoffset 1s linear;" />
            </g>
            <text id="admin-log-timer-text" cx="17" cy="17" x="17" y="21" text-anchor="middle" fill="#00aa00" 
              style="font-family: monospace; font-size: 11px; font-weight: bold;"></text>
          </svg>
        </div>

        <!-- Live-Filter (Bleibt bombenfest an seiner Position) -->
        <div style="display: flex; align-items: center; gap: 6px; width: 100%; max-width: 320px; flex-shrink: 0;">
          <span style="font-weight: bold; font-size: 13px; color: #333333; white-space: nowrap;">Filtern:</span>
          <input type="text" id="admin-log-search-input" placeholder="z.B. [ATTACK], 404, /api/auth" 
            style="width: 100%; height: 32px; padding: 6px 10px; background: #222222; color: #ffffff; border: 1px solid #444444; border-radius: 4px; font-family: inherit; font-size: 13px; box-sizing: border-box;">
        </div>
      </div>

    </div>

    <!-- Log-Terminal Bereich -->
    <div style="max-height: 500px; overflow-y: auto; padding-right: 5px; width: 100%; background: #000000; border-radius: 4px;">
      <pre id="admin-log-terminal" style="margin: 0; padding: 15px; color: #00ff00; font-family: monospace; font-size: 13px; line-height: 1.5; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">[System]: Fetching live log streams from server engine...
[System]: Awaiting pipeline connection...</pre>
    </div>
  `;


  if (typeof window.translatePage === "function") {
    window.translatePage();
  }

  const limitSelect = document.getElementById("admin-log-limit-select");
  const refreshSelect = document.getElementById("admin-log-refresh-select");
  const searchInput = document.getElementById("admin-log-search-input");
  const refreshBtn = document.getElementById("admin-log-manual-refresh");

  if (limitSelect && refreshSelect && searchInput && refreshBtn) {
    limitSelect.addEventListener("change", () => {
      fetchTerminalStreams(limitSelect.value);
      setupRefreshTimer(limitSelect.value, parseInt(refreshSelect.value, 10));
    });

    refreshSelect.addEventListener("change", () => {
      setupRefreshTimer(limitSelect.value, parseInt(refreshSelect.value, 10));
    });

    // NEU: Horchposten auf dem Eingabefeld (reagiert sofort beim Tippen)
    searchInput.addEventListener("input", (e) => {
      applyLogFilter(e.target.value);
    });

    // Event-Listener für den manuellen Refresh-Button
    refreshBtn.addEventListener("click", () => {
      const limit = limitSelect.value;
      const seconds = parseInt(refreshSelect.value, 10);
      
      // Holt sofort frische Logs vom Server
      fetchTerminalStreams(limit);
      
      // Falls Auto-Refresh aktiv ist, starten wir Timer & Kreis neu
      if (seconds > 0) {
        setupRefreshTimer(limit, seconds);
      }
    });

    fetchTerminalStreams(limitSelect.value);
    setupRefreshTimer(limitSelect.value, parseInt(refreshSelect.value, 10));
  }
};
