// =============================================================================
// APPANDOR LOGISTICS: MODULE - SERVER METRICS WORKER (CRLF)
// =============================================================================

function formatUptimeFromSeconds(totalSeconds) {
  if (totalSeconds === null || totalSeconds < 0) return "-";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours} Std, ${minutes} Min, ${seconds} Sek`;
}

function executeMetricsPipeline(uptimeCell, ramCell, diskCell, token) {
  // Fetch 1: Uptime
  fetch('/api/admin/metrics/uptime', { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json()).then(data => { if (data && typeof data.uptime_seconds === 'number' && uptimeCell) uptimeCell.innerText = formatUptimeFromSeconds(data.uptime_seconds); })
    .catch(err => console.error("[Metrics Pipeline Uptime Error]:", err.message));

  // Fetch 2: RAM
  fetch('/api/admin/metrics/ram', { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json()).then(data => { if (data && typeof data.ram_mb === 'number' && ramCell) ramCell.innerText = `${data.ram_mb} MB`; })
    .catch(err => console.error("[Metrics Pipeline RAM Error]:", err.message));

  // Fetch 3: Disk Space
  fetch('/api/admin/metrics/disk', { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json()).then(data => { if (data && typeof data.disk_free_gb === 'number' && diskCell) diskCell.innerText = `${data.disk_free_gb} GB frei`; })
    .catch(err => console.error("[Metrics Pipeline Disk Error]:", err.message));

  // Fetch 4: Engine-Bereinigung (Garbage Collection)
  const gcCell = document.getElementById("metric-live-gc");
  fetch('/api/admin/metrics/gc', { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json()).then(data => {
      if (data && data.gc_status && gcCell) {
        gcCell.innerText = data.gc_status;
        gcCell.style.color = data.gc_status.includes("Aktiv") ? "#ef6c00" : "#1e1e1e";
      }
    }).catch(err => console.error("[Metrics Pipeline GC Error]:", err.message));

  // Fetch 5: API-Antwortzeit (Latency)
  const latencyCell = document.getElementById("metric-live-latency");
  fetch('/api/admin/metrics/latency', { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json()).then(data => {
      if (data && typeof data.avg_latency_ms === 'number' && latencyCell) {
        latencyCell.innerText = `${data.avg_latency_ms} ms`;
        latencyCell.style.color = data.avg_latency_ms > 200 ? "#c62828" : "#2e7d32";
      }
    }).catch(err => console.error("[Metrics Pipeline Latency Error]:", err.message));
}

window.initAdminMetrics = function() {
  const mainContainer = document.getElementById("container");
  if (!mainContainer) return;

  // UNBESTECHLICHER UNTERSCHIED: Alle data-i18n-Schlüssel konsequent in KLEINSCHREIBUNG
  mainContainer.innerHTML = `
    <div class="lay_form-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; padding: 15px; width: 100%; box-sizing: border-box;">
      
      <!-- KACHEL 1: BETRIEBSZEIT -->
      <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; margin: 0; min-height: 100px;">
        <span data-i18n="admin_metrics_label_uptime" style="font-size: 10px; font-weight: bold; text-transform: color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;"></span>
        <div id="metric-live-uptime" style="font-size: 16px; font-weight: bold; color: #1b5e20;">-</div>
      </div>

      <!-- KACHEL 2: ARBEITSSPEICHER -->
      <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; margin: 0; min-height: 100px;">
        <span data-i18n="admin_metrics_label_ram_used" style="font-size: 10px; font-weight: bold; text-transform: color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;"></span>
        <div id="metric-live-ram" style="font-size: 18px; font-weight: bold; color: #1e1e1e;">-</div>
      </div>

      <!-- KACHEL 3: FESTPLATTENSPEICHER -->
      <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; margin: 0; min-height: 100px;">
        <span data-i18n="admin_metrics_label_disk_free" style="font-size: 10px; font-weight: bold; text-transform: color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;"></span>
        <div id="metric-live-disk" style="font-size: 18px; font-weight: bold; color: #b71c1c;">-</div>
      </div>

      <!-- KACHEL 4: BEREINIGUNGSSTATUS (GARBAGE COLLECTION) -->
      <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; margin: 0; min-height: 100px;">
        <span data-i18n="admin_metrics_label_gc_status" style="font-size: 10px; font-weight: bold; text-transform: color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;"></span>
        <div id="metric-live-gc" style="font-size: 18px; font-weight: bold; color: #1e1e1e;">-</div>
      </div>

      <!-- KACHEL 5: API-ANTWORTZEIT (LATENCY) -->
      <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; margin: 0; min-height: 100px;">
        <span data-i18n="admin_metrics_label_api_latency" style="font-size: 10px; font-weight: bold; text-transform: color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;"></span>
        <div id="metric-live-latency" style="font-size: 18px; font-weight: bold; color: #1e1e1e;">-</div>
      </div>

    </div>
  `;

  if (typeof window.translatePage === "function") {
    window.translatePage();
  }

  const uptimeCell = document.getElementById("metric-live-uptime");
  const ramCell = document.getElementById("metric-live-ram");
  const diskCell = document.getElementById("metric-live-disk");
  const token = localStorage.getItem('appandor_jwt_token');

  executeMetricsPipeline(uptimeCell, ramCell, diskCell, token);

  const liveInterval = setInterval(() => {
    executeMetricsPipeline(uptimeCell, ramCell, diskCell, token);
  }, 1000);

  const observer = new MutationObserver(() => {
    if (!document.getElementById("metric-live-uptime")) {
      clearInterval(liveInterval);
      observer.disconnect();
      console.log("[Admin-Metrics Module]: Grid verlassen. Pipeline-Fetch gestoppt.");
    }
  });

  observer.observe(mainContainer, { childList: true });
};
