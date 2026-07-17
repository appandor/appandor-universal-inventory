// =============================================================================
// APPANDOR LOGISTICS: MODULE - SYSTEM LOGS WORKER (CRLF)
// =============================================================================

function fetchTerminalStreams(limitValue) {
  const terminal = document.getElementById("admin-log-terminal");
  const token = localStorage.getItem('appandor_jwt_token');
  if (!terminal) return;

  // Kleiner visueller Ladehinweis im Terminal, während die API antwortet
  terminal.style.color = "#00ff00";
  
  // Wir übergeben das Limit als unbestechlichen Query-Parameter an die API
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
      terminal.innerText = data.logs;
      // Scrollt das Terminal automatisch ganz nach unten zu den neuesten Einträgen
      const container = terminal.parentElement;
      if (container) container.scrollTop = container.scrollHeight;
    } else {
      terminal.innerText = "[System]: Keine Protokolleinträge gefunden.";
    }
  })
  .catch(err => {
    terminal.style.color = "#ff3333";
    terminal.innerText = `[SYSTEM ERROR]: ${err.message}\nProtokoll-Streaming abgebrochen.`;
  });
}

// Globaler Einstiegspunkt für diesen Reiter (Verfügbar für die admin.js)
window.initAdminLogs = function() {
  const mainContainer = document.getElementById("container");
  if (!mainContainer) return;

  // Injiziert das Dropdown-Menü und das Terminal-Gehäuse autonom
  mainContainer.innerHTML = `
    <div id="admin-log-filter-zone" class="form-group" style="max-width: 200px; margin-bottom: 15px;">
      <label for="admin-log-limit-select" data-i18n="admin_label_log_limit" style="font-weight: bold; display: block; margin-bottom: 5px;"></label>
      <select id="admin-log-limit-select" class="lay_input-select">
        <option value="100">100</option>
        <option value="500">500</option>
        <option value="1000">1000</option>
      </select>
    </div>

    <div style="max-height: 500px; overflow-y: auto; padding-right: 5px; flex: 1; width: 100%;">
      <pre id="admin-log-terminal" style="margin: 0; padding: 15px; background: #000000; color: #00ff00; font-family: monospace; font-size: 13px; line-height: 1.5; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">
[System]: Fetching live log streams from server engine...
[System]: Awaiting pipeline connection...
      </pre>
    </div>
  `;

  if (typeof window.translatePage === "function") {
    window.translatePage();
  }

  const limitSelect = document.getElementById("admin-log-limit-select");
  if (limitSelect) {
    // Horchposten: Wenn Hugo das Dropdown ändert, laden wir die Zeilen sofort neu
    limitSelect.addEventListener("change", (e) => {
      fetchTerminalStreams(e.target.value);
    });

    // Initialer Start beim Laden des Reiters mit dem Standardwert 100
    fetchTerminalStreams(limitSelect.value);
  }
};
