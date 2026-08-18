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

function executeMetricsPipeline(uptimeCell, ramCell, diskCell, gcCell, latencyCell, cpuCell, token) {
  // NUR NOCH EIN EINZIGER FETCH FÜR ALLE DATEN! 🚀
  fetch('/api/admin/metrics/all', { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => {
      if (!res.ok) throw new Error("Pipeline Response Error");
      return res.json();
    })
    .then(data => {
      if (!data) return;

      // 1. Uptime
      if (typeof data.uptime_seconds === 'number' && uptimeCell) {
        uptimeCell.innerText = formatUptimeFromSeconds(data.uptime_seconds);
      }
      // 2. RAM
      if (typeof data.ram_mb === 'number' && ramCell) {
        ramCell.innerText = `${data.ram_mb} MB`;
      }
      // 3. Disk Space
      if (typeof data.disk_free_gb === 'number' && diskCell) {
        diskCell.innerText = `${data.disk_free_gb} GB frei`;
      }
      // 4. Garbage Collection
      if (data.gc_status && gcCell) {
        gcCell.innerText = data.gc_status;
        gcCell.style.color = data.gc_status.includes("Aktiv") ? "#ef6c00" : "#1e1e1e";
      }
      // 5. Latency
      if (typeof data.avg_latency_ms === 'number' && latencyCell) {
        latencyCell.innerText = `${data.avg_latency_ms} ms`;
        latencyCell.style.color = data.avg_latency_ms > 200 ? "#c62828" : "#2e7d32";
      }
      // 6. CPU
      if (typeof data.cpu_percent === 'number' && cpuCell) {
        cpuCell.innerText = `${data.cpu_percent} %`;
        cpuCell.style.color = data.cpu_percent > 80 ? "#c62828" : "#2e7d32";
      }
    })
    .catch(err => console.error("[Metrics Pipeline ALL Error]:", err.message));
}

window.initAdminMetrics = function() {
  const mainContainer = document.getElementById("container");
  if (!mainContainer) return;

  mainContainer.innerHTML = `
    <div class="lay_form-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; padding: 15px; width: 100%; box-sizing: border-box;">
      <div class="card"><span data-i18n="admin_metrics_label_uptime" style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;"></span><div id="metric-live-uptime" style="font-size: 16px; font-weight: bold; color: #1b5e20;">-</div></div>
      <div class="card"><span data-i18n="admin_metrics_label_ram_used" style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;"></span><div id="metric-live-ram" style="font-size: 18px; font-weight: bold; color: #1e1e1e;">-</div></div>
      <div class="card"><span data-i18n="admin_metrics_label_disk_free" style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;"></span><div id="metric-live-disk" style="font-size: 18px; font-weight: bold; color: #b71c1c;">-</div></div>
      <div class="card"><span data-i18n="admin_metrics_label_gc_status" style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;"></span><div id="metric-live-gc" style="font-size: 18px; font-weight: bold; color: #1e1e1e;">-</div></div>
      <div class="card"><span data-i18n="admin_metrics_label_api_latency" style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;"></span><div id="metric-live-latency" style="font-size: 18px; font-weight: bold; color: #1e1e1e;">-</div></div>
      <div class="card"><span data-i18n="admin_metrics_label_cpu_load" style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;"></span><div id="metric-live-cpu" style="font-size: 18px; font-weight: bold; color: #1e1e1e;">-</div></div>
    </div>
  `;

  if (typeof window.translatePage === "function") {
    window.translatePage();
  }

  const uptimeCell = document.getElementById("metric-live-uptime");
  const ramCell = document.getElementById("metric-live-ram");
  const diskCell = document.getElementById("metric-live-disk");
  const gcCell = document.getElementById("metric-live-gc");
  const latencyCell = document.getElementById("metric-live-latency");
  const cpuCell = document.getElementById("metric-live-cpu");
  const token = localStorage.getItem('appandor_jwt_token');

  executeMetricsPipeline(uptimeCell, ramCell, diskCell, gcCell, latencyCell, cpuCell, token);

  const liveInterval = setInterval(() => {
    executeMetricsPipeline(uptimeCell, ramCell, diskCell, gcCell, latencyCell, cpuCell, token);
  }, 1000);

  const observer = new MutationObserver(() => {
    if (!document.getElementById("metric-live-uptime")) {
      clearInterval(liveInterval);
      observer.disconnect();
      console.log("[Admin-Metrics Module]: Grid exited. Pipeline fetch stopped.");
    }
  });

  observer.observe(mainContainer, { childList: true });
};
