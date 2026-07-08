// =============================================================================
// APPANDOR LOGISTICS: LIVE INVENTORY ENGINE
// =============================================================================

function loadInventoryTable() {
  // KORREKTUR: ID an dein neues HTML-Muster mit Unterstrich angepasst
  const tableContainer = document.getElementById("inventory_table-container");
  if (!tableContainer) return;

  const token = localStorage.getItem('appandor_jwt_token');
  
  // UNBESTECHLICH: Zieht die Übersetzungen direkt ohne Netzwerk-Fetch aus dem RAM
  const translations = window.appTranslations || {};

  fetch('/api/inventory', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(response => { 
    if (!response.ok) throw new Error("Database dynamic ledger failed"); 
    return response.json(); 
  })
  .then(data => {
    if (data.length === 0) {
      tableContainer.innerHTML = `<p style="color: #888; font-style: italic;">No assets registered.</p>`;
      return;
    }

    let tableHTML = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; text-align: left;">
        <thead>
          <!-- KORREKTUR: color auf var(--text-color) umgestellt für automatischen Hell-/Dunkelwechsel -->
          <tr style="border-bottom: 2px solid #444; color: var(--text-color);">
            <th style="padding: 12px 8px;" data-i18n="tbl_box_id"></th>
            <th style="padding: 12px 8px;" data-i18n="tbl_storage_location"></th>
            <th style="padding: 12px 8px;" data-i18n="tbl_product_name"></th>
            <th style="padding: 12px 8px;" data-i18n="tbl_barcode"></th>
            <th style="padding: 12px 8px; text-align: right;" data-i18n="tbl_price_gross"></th>
            <th style="padding: 12px 8px; text-align: center;" data-i18n="tbl_logistics_status"></th>
          </tr>
        </thead>
        <tbody>
      `;


    data.forEach((row, index) => {
      const priceFormatted = row.price ? parseFloat(row.price).toFixed(2) + ' €' : '-';
      const productName = row.product_name || '';
      const barcode = row.barcode || '-';
      const location = row.storage_location || 'Unpositioned';
      const statusText = row.status === 'RECEIVED' ? (translations.status_received || 'RECEIVED') : (translations.status_ordered || 'ORDERED');
      
      const badgeClass = row.status === 'RECEIVED' ? 'badge-received' : 'badge-ordered';
      const bgStyle = index % 2 === 0 ? 'background: var(--table-row-even);' : 'background: var(--table-row-odd);';

      tableHTML += `
        <tr style="${bgStyle} border-bottom: 1px solid #333; color: #ccc;">
          <td style="padding: 12px 8px; font-family: monospace; font-weight: bold; color: #2e7d32;">${row.box_id}</td>
          <td style="padding: 12px 8px;">${location}</td>
          <td style="padding: 12px 8px; color: #fff;">${productName}</td>
          <td style="padding: 12px 8px; font-family: monospace; color: #888;">${barcode}</td>
          <td style="padding: 12px 8px; text-align: right; font-weight: bold;">${priceFormatted}</td>
          <td style="padding: 12px 8px; text-align: center;">
            <span class="status-badge-container ${badgeClass}">${statusText}</span>
          </td>
        </tr>
      `;
    });

    tableHTML += `</tbody></table>`;
    tableContainer.innerHTML = tableHTML;

    if (typeof window.translatePage === 'function') {
      window.translatePage();
    }
  })
  .catch(err => {
    console.error("[Inventory UI Error]:", err.message);
    tableContainer.innerHTML = `<p style="color: #c62828; font-weight: bold;">Error connecting to inventory ledger.</p>`;
  });
}

window.addEventListener("appandor_platform_ready", () => {
  loadInventoryTable();
});

// Reagiert live im Browser auf manuelle Flaggen- und Sprachwechsel
window.addEventListener('appandor_language_changed', () => {
  loadInventoryTable();
});
