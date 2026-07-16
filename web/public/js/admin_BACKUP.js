// =============================================================================
// APPANDOR LOGISTICS: SYSTEM ADMINISTRATION ENGINE (CRLF)
// =============================================================================

function loadAdminTablesDropdown() {
  const token = localStorage.getItem('appandor_jwt_token');
  const tableSelect = document.getElementById("admin-table-select");
  
  if (!tableSelect) return;

  fetch('/api/admin/tables', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(tables => {
    tableSelect.innerHTML = `<option value="" data-i18n="admin_opt_choose"></option>`;
    
    if (!tables || tables.error || tables.length === 0) {
      if (typeof window.translatePage === "function") window.translatePage();
      return;
    }

    tables.forEach(t => {
      const option = document.createElement("option");
      option.value = t.table_name;
      option.innerText = t.table_name;
      tableSelect.appendChild(option);
    });

    if (typeof window.translatePage === "function") window.translatePage();
  })
  .catch(err => console.error("[UI Admin Tables Error]:", err.message));
}

function inspectTableContent(tableName) {
  const token = localStorage.getItem('appandor_jwt_token');
  const tableContainer = document.getElementById("tbl_table-container");
  
  if (!tableContainer || !tableName) return;

  fetch(`/api/admin/table/${tableName}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => {
    if (!data || data.error || data.length === 0) {
      tableContainer.innerHTML = `<p class="tbl_msg-empty" data-i18n="admin_msg_empty_table"></p>`;
      if (typeof window.translatePage === "function") window.translatePage();
      return;
    }

    const columns = Object.keys(data[0]);
    
    let html = `<table class="tbl_table"><thead><tr>`;
    columns.forEach(col => {
      html += `<th>${col}</th>`;
    });
    html += `</tr></thead><tbody>`;

    data.forEach((row, index) => {
      const rowClass = index % 2 === 0 ? 'tbl_row-even' : 'tbl_row-odd';
      html += `<tr class="${rowClass}">`;
      columns.forEach(col => {
        const val = row[col] !== null ? row[col] : '-';
        html += `<td>${val}</td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    tableContainer.innerHTML = html;
    
    if (typeof window.translatePage === "function") window.translatePage();
  })
  .catch(err => {
    console.error("[UI Admin Inspect Error]:", err.message);
    tableContainer.innerHTML = `<p class="tbl_text-bold tbl_msg-error" data-i18n="gen_ledger_error"></p>`;
  });
}

// =============================================================================
// INITIALISIERUNG ÜBER DIE ZENTRALE LADEKETTE
// =============================================================================
window.addEventListener("appandor_platform_ready", () => {
  loadAdminTablesDropdown();

  const tableSelect = document.getElementById("admin-table-select");
  const filterZone = document.getElementById("admin-table-filter-zone");
  const tableContainer = document.getElementById("tbl_table-container");

  const tabTables = document.getElementById("admin-tab-tables");
  const tabLogs = document.getElementById("admin-tab-logs");
  const tabMetrics = document.getElementById("admin-tab-metrics");

  // UNBESTECHLICHER DIAGNOSE-CHECK: Prüft, ob alle DOM-Elemente da sind
  if (!tableContainer) console.error("[CORE ERROR]: Element #tbl_table-container fehlt im HTML!");
  if (!tabMetrics) console.error("[CORE ERROR]: Element #admin-tab-metrics fehlt im HTML!");

  if (tableSelect) {
    tableSelect.addEventListener("change", (e) => {
      inspectTableContent(e.target.value);
    });
  }

  // HORCHPOSTEN: System Neustarten
  const restartBtn = document.getElementById("admin-btn-restart");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      const token = localStorage.getItem('appandor_jwt_token');
      
      if (!confirm("Möchtest du das System jetzt wirklich neu starten?")) return;

      fetch('/api/admin/system/execute', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ action: "restart_node" })
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          alert("Neustart erfolgreich eingeleitet!");
          setTimeout(() => location.reload(), 3000);
        } else {
          alert("Fehler beim Neustart: " + (resData.error || "Unbekannter Fehler"));
        }
      })
      .catch(err => console.error("[UI Admin Restart Error]:", err.message));
    });
  }

  // REITER-SWITCH: LOGS GEKLICKT
  if (tabLogs) {
    tabLogs.addEventListener("click", () => {
      if (!tableContainer) return;
      
      if (tabTables) tabTables.classList.remove("active");
      if (tabMetrics) tabMetrics.classList.remove("active");
      tabLogs.classList.add("active");

      if (filterZone) filterZone.style.display = "none";
      if (tableSelect) tableSelect.value = "";

      tableContainer.innerHTML = `
        <pre style="margin: 0; padding: 15px; background: #000000; color: #00ff00; font-family: monospace; font-size: 13px; line-height: 1.5; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">
[System]: Fetching live log streams from server engine...
[System]: Awaiting pipeline connection...
        </pre>
      `;
    });
  }

  // REITER-SWITCH: TABLES GEKLICKT
  if (tabTables) {
    tabTables.addEventListener("click", () => {
      if (!tableContainer) return;

      if (tabLogs) tabLogs.classList.remove("active");
      if (tabMetrics) tabMetrics.classList.remove("active");
      tabTables.classList.add("active");

      if (filterZone) filterZone.style.display = "block";
      
      tableContainer.innerHTML = `<p class="tbl_msg-empty" data-i18n="admin_msg_select_table_prompt"></p>`;
      if (typeof window.translatePage === "function") window.translatePage();
    });
  }

  // REITER-SWITCH: METRICS GEKLICKT
  if (tabMetrics) {
    tabMetrics.addEventListener("click", () => {
      if (!tableContainer) return;

      if (tabTables) tabTables.classList.remove("active");
      if (tabLogs) tabLogs.classList.remove("active");
      tabMetrics.classList.add("active");

      if (filterZone) filterZone.style.display = "none";
      if (tableSelect) tableSelect.value = "";

      tableContainer.innerHTML = `
        <div style="padding: 15px; color: var(--text-muted);" data-i18n="gen_loading_records">
          Lade System-Metriken...
        </div>
      `;
      if (typeof window.translatePage === "function") window.translatePage();
    });
  }

  window.dispatchEvent(new Event("appandor_render_complete"));
});

window.addEventListener('appandor_language_changed', () => loadAdminTablesDropdown());
