// =============================================================================
// APPANDOR LOGISTICS: MODULE - DATABASE TABLES INSPECTOR (CRLF)
// =============================================================================

function loadTableDataRows(tableName) {
  const tableDataZone = document.getElementById("admin-table-data-zone");
  const token = localStorage.getItem('appandor_jwt_token');
  if (!tableDataZone || !tableName) return;

  tableDataZone.innerHTML = `<div style="padding: 10px; font-style: italic;">Streaming ledger lines from ${tableName}...</div>`;

  fetch(`/api/admin/table/${tableName}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => {
    if (!res.ok) throw new Error("Access denied or table missing");
    return res.json();
  })
  .then(rows => {
    if (!rows || rows.length === 0) {
      tableDataZone.innerHTML = `<div style="padding: 10px; color: var(--text-muted);">[System]: Keine Datensätze in dieser Tabelle gefunden.</div>`;
      return;
    }

    // Spaltenköpfe dynamisch aus dem ersten Datensatz ermitteln
    const columns = Object.keys(rows[0]);
    
    let tableHtml = `
      <div style="overflow-x: auto; width: 100%; margin-top: 15px;">
        <table class="tbl_table" style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #f5f5f5; border-bottom: 2px solid var(--border-color);">
    `;
    
    columns.forEach(col => {
      tableHtml += `<th style="padding: 10px; font-weight: bold; font-size: 12px;">${col}</th>`;
    });
    
    tableHtml += `</tr></thead><tbody>`;
    
    rows.forEach((row, idx) => {
      const rowClass = idx % 2 === 0 ? "tbl_row-even" : "tbl_row-odd";
      tableHtml += `<tr class="${rowClass}" style="border-bottom: 1px solid var(--border-color);">`;
      columns.forEach(col => {
        let val = row[col];
        if (val === null || val === undefined) val = "-";
        tableHtml += `<td style="padding: 10px; font-size: 12px; font-family: monospace;">${val}</td>`;
      });
      tableHtml += `</tr>`;
    });
    
    tableHtml += `</tbody></table></div>`;
    tableDataZone.innerHTML = tableHtml;
  })
  .catch(err => {
    tableDataZone.innerHTML = `<div style="padding: 10px; color: #b71c1c; font-weight: bold;">Fehler: ${err.message}</div>`;
  });
}

window.initAdminTables = function() {
  const mainContainer = document.getElementById("container");
  if (!mainContainer) return;

  mainContainer.innerHTML = `
    <div id="admin-tables-control-zone" style="padding: 15px; width: 100%; box-sizing: border-box;">
      <div class="form-group" style="max-width: 300px; margin-bottom: 15px;">
        <label for="admin-table-select" style="font-weight: bold; display: block; margin-bottom: 5px;">Datenbank-Tabelle auswählen:</label>
        <select id="admin-table-select" class="lay_input-select">
          <option value="">-- Bitte wählen --</option>
        </select>
      </div>
      <div id="admin-table-data-zone"></div>
    </div>
  `;

  const select = document.getElementById("admin-table-select");
  const token = localStorage.getItem('appandor_jwt_token');

  if (!select) return;

  // 1. Holt alle existierenden Tabellennamen dynamisch aus dem PostgreSQL-Schema
  fetch('/api/admin/tables', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(tables => {
    tables.forEach(table => {
      const opt = document.createElement("option");
      opt.value = table.table_name;
      opt.innerText = table.table_name;
      select.appendChild(opt);
    });

    // =============================================================================
    // REAKTIVIERUNG: Prüft nach dem Laden, ob noch eine Tabelle im RAM vermerkt ist
    // =============================================================================
    const rememberedTable = sessionStorage.getItem("appandor_admin_active_table_name");
    if (rememberedTable) {
      select.value = rememberedTable;
      loadTableDataRows(rememberedTable);
    }
  })
  .catch(err => console.error("[API Admin Tables Schema Fetch Error]:", err.message));

  // 2. Horchposten: Wenn Hugo eine Tabelle auswählt, wird das unbestechlich im RAM vermerkt
  select.addEventListener("change", (e) => {
    const selectedTable = e.target.value;
    if (selectedTable) {
      sessionStorage.setItem("appandor_admin_active_table_name", selectedTable);
      loadTableDataRows(selectedTable);
    } else {
      sessionStorage.removeItem("appandor_admin_active_table_name");
      const tableDataZone = document.getElementById("admin-table-data-zone");
      if (tableDataZone) tableDataZone.innerHTML = "";
    }
  });
};
