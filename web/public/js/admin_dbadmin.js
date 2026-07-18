// =============================================================================
// APPANDOR LOGISTICS: MODULE - DATABASE ADMIN DIRECT CONSOLE & METRICS (CRLF)
// =============================================================================

function executeDbMetricsPipeline(sizeCell, connCell, cacheCell, token) {
  // Fetch 1: Echte DB-Größe über den neuen Pfad /metrics_db
  fetch('/api/admin/metrics_db/db-size', { 
    method: 'GET', 
    headers: { 'Authorization': `Bearer ${token}` } 
  })
  .then(res => res.json())
  .then(data => { if (data && data.size_mb !== undefined && sizeCell) sizeCell.innerText = `${data.size_mb} MB`; })
  .catch(err => console.error("[DB Pipeline Size Error]:", err.message));

  // Fetch 2: Aktive Verbindungen über den neuen Pfad /metrics_db
  fetch('/api/admin/metrics_db/db-connections', { 
    method: 'GET', 
    headers: { 'Authorization': `Bearer ${token}` } 
  })
  .then(res => res.json())
  .then(data => { if (data && typeof data.active_connections === 'number' && connCell) connCell.innerText = data.active_connections; })
  .catch(err => console.error("[DB Pipeline Connections Error]:", err.message));

  // Fetch 3: Cache-Hit-Rate über den neuen Pfad /metrics_db
  fetch('/api/admin/metrics_db/db-cache', { 
    method: 'GET', 
    headers: { 'Authorization': `Bearer ${token}` } 
  })
  .then(res => res.json())
  .then(data => { if (data && data.cache_hit_rate && cacheCell) cacheCell.innerText = data.cache_hit_rate; })
  .catch(err => console.error("[DB Pipeline Cache Error]:", err.message));
}

window.initAdminDbAdmin = function() {
  const mainContainer = document.getElementById("container");
  if (!mainContainer) return;

  mainContainer.innerHTML = `
    <div style="padding: 15px; width: 100%; box-sizing: border-box;">
      
      <!-- 1. ETAGE: DIE EINKLAPPBARE SQL-DIREKTKONSOLE (PRODUKTIV-GEHÄUSE) -->
      <div class="card" style="margin-bottom: 25px; padding: 20px;">
        <div id="admin-sql-toggle-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
          <h3 style="margin: 0; font-size: 14px; font-weight: bold;" data-i18n="admin_dbadmin_db_console_title"></h3>
          <span id="admin-sql-toggle-btn" class="tbl_text-bold" data-i18n="btn_expand" style="font-size: 11px; font-family: monospace; letter-spacing: 0.5px;"></span>
        </div>

        <div id="admin-sql-expand-zone" style="display: none;">
          <div style="border-top: 1px solid var(--border-color); margin-top: 15px; padding-top: 15px;">
            <div class="form-group" style="margin-bottom: 15px;">
              <label for="admin-sql-input" data-i18n="admin_label_sql_query" style="font-weight: bold; display: block; margin-bottom: 5px;">admin_label_sql_query</label>
              <textarea id="admin-sql-input" class="lay_input-textarea" placeholder="Z.B. ALTER TABLE ... oder SELECT * FROM ..." style="width: 100%; height: 120px; font-family: monospace; background: #1a1a1a; color: #00ff00; border: 1px solid var(--border-color); padding: 10px; border-radius: 4px; box-sizing: border-box; resize: vertical;"></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; width: 100%; margin-bottom: 15px;">
              <button id="admin-btn-execute-sql" class="lay_btn-primary" data-i18n="admin_btn_execute_sql" style="background: #2e7d32; border-color: #1b5e20; color: #ffffff; padding: 10px 20px; font-weight: bold; border-radius: 4px; cursor: pointer; width: auto;">admin_btn_execute_sql</button>
            </div>

            <div id="admin-sql-response-zone"></div>
          </div>
        </div>
      </div>

      <!-- 2. ETAGE: DAS SYMMETRISCHE DB-KACHEL-GRID -->
      <div class="lay_form-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 15px; width: 100%; box-sizing: border-box;">
        
        <!-- KACHEL 1: DATENBANK-GRÖSSE -->
        <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; margin: 0; min-height: 100px;">
          <span data-i18n="admin_metrics_db_size" style="font-size: 10px; font-weight: bold; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;">admin_metrics_db_size</span>
          <div id="db-metric-live-size" style="font-size: 18px; font-weight: bold; color: #1e1e1e;">-</div>
        </div>

        <!-- KACHEL 2: AKTIVE CONNECTIONS -->
        <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; margin: 0; min-height: 100px;">
          <span data-i18n="admin_metrics_db_connections" style="font-size: 10px; font-weight: bold; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;">admin_metrics_db_connections</span>
          <div id="db-metric-live-connections" style="font-size: 18px; font-weight: bold; color: #2e7d32;">-</div>
        </div>

        <!-- KACHEL 3: CACHE-HIT-RATE -->
        <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; margin: 0; min-height: 100px;">
          <span data-i18n="admin_metrics_db_cache" style="font-size: 10px; font-weight: bold; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;">admin_metrics_db_cache</span>
          <div id="db-metric-live-cache" style="font-size: 18px; font-weight: bold; color: #1565c0;">-</div>
        </div>

      </div>
    </div>
  `;

  if (typeof window.translatePage === "function") {
    window.translatePage();
  }

  // Mechanik für das Minimieren/Einblenden
  const toggleHeader = document.getElementById("admin-sql-toggle-header");
  const expandZone = document.getElementById("admin-sql-expand-zone");
  const btn = document.getElementById("admin-sql-toggle-btn");

  if (toggleHeader && expandZone && btn) {
    toggleHeader.addEventListener("click", () => {
      if (expandZone.style.display === "none") {
        expandZone.style.display = "block";
        btn.setAttribute("data-i18n", "btn_collapse");
        btn.removeAttribute("data-state");
      } else {
        expandZone.style.display = "none";
        btn.setAttribute("data-i18n", "btn_expand");
        btn.setAttribute("data-state", "collapsed");
      }
      if (typeof window.translatePage === "function") window.translatePage();
    });
  }

  // Logik für die SQL-Ausführung
  const executeBtn = document.getElementById("admin-btn-execute-sql");
  const sqlInput = document.getElementById("admin-sql-input");
  const responseZone = document.getElementById("admin-sql-response-zone");
  const token = localStorage.getItem('appandor_jwt_token');

  if (executeBtn && sqlInput && responseZone) {
    executeBtn.addEventListener("click", () => {
      const queryStr = sqlInput.value;
      if (!queryStr || queryStr.trim() === "") return;

      responseZone.innerHTML = `<div style="font-style: italic; color: var(--text-muted); margin-top: 15px;">Executing statement on database host...</div>`;

      fetch('/api/admin/execute-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: queryStr })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          responseZone.innerHTML = `<div style="padding: 10px; background: #e8f5e9; color: #2e7d32; border-left: 4px solid #4caf50; font-family: monospace; font-size: 13px; margin-top: 15px;">${data.message}</div>`;
        } else {
          responseZone.innerHTML = `<div style="padding: 10px; background: #ffebee; color: #c62828; border-left: 4px solid #f44336; font-family: monospace; font-size: 13px; margin-top: 15px;">Error: ${data.error}</div>`;
        }
      })
      .catch(err => {
        responseZone.innerHTML = `<div style="padding: 10px; background: #ffebee; color: #c62828; border-left: 4px solid #f44336; font-family: monospace; font-size: 13px; margin-top: 15px;">Pipeline Error: ${err.message}</div>`;
      });
    });
  }

  // Metriken-Pipeline schalten
  const sizeCell = document.getElementById("db-metric-live-size");
  const connCell = document.getElementById("db-metric-live-connections");
  const cacheCell = document.getElementById("db-metric-live-cache");

  executeDbMetricsPipeline(sizeCell, connCell, cacheCell, token);

  const liveInterval = setInterval(() => {
    executeDbMetricsPipeline(sizeCell, connCell, cacheCell, token);
  }, 1000);

  const observer = new MutationObserver(() => {
    if (!document.getElementById("db-metric-live-size")) {
      clearInterval(liveInterval);
      observer.disconnect();
      console.log("[DB-Metrics Module]: Sektor verlassen. Live-Pipeline gestoppt.");
    }
  });

  observer.observe(mainContainer, { childList: true });
};
