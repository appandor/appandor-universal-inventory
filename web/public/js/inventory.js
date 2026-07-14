// =============================================================================
// APPANDOR LOGISTICS: LIVE INVENTORY ENGINE (CRLF)
// =============================================================================

function loadInventoryTable() {
  const tableContainer = document.getElementById("tbl_table-container");
  if (!tableContainer) return;

// =============================================================================
// Get Data for Table
// =============================================================================

  const token = localStorage.getItem('appandor_jwt_token');
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
      tableContainer.innerHTML = `<p class="tbl_msg-empty" data-i18n="gen_no_assets"></p>`;
      window.dispatchEvent(new Event("appandor_render_complete"));
      return;
    }

// =============================================================================
// Table
// =============================================================================

    let tableHTML = `
      <table class="tbl_table">
        <thead>
          <tr>
            <th data-i18n="tbl_box_id"></th>
            <th data-i18n="tbl_storage_location"></th>
            <th data-i18n="tbl_product_name"></th>
            <th data-i18n="tbl_barcode"></th>
            <th class="tbl_text-right" data-i18n="tbl_price_gross"></th>
            <th class="tbl_text-center" data-i18n="tbl_logistics_status"></th>
          </tr>
        </thead>
        <tbody>
    `;

    data.forEach((row, index) => {
      const priceFormatted = row.price ? parseFloat(row.price).toFixed(2) + ' €' : '-';
      const productName = row.product_name || '';
      const barcode = row.barcode || '-';
      const location = row.storage_location || 'Unpositioned';
      const statusI18nKey = row.status === 'RECEIVED' ? 'status_received' : 'status_ordered';
      const badgeClass = row.status === 'RECEIVED' ? 'badge-received' : 'badge-ordered';      
      const rowClass = index % 2 === 0 ? 'tbl_row-even' : 'tbl_row-odd';

      tableHTML += `
        <tr class="${rowClass}">
          <td class="tbl_cell-box-id">${row.box_id}</td>
          <td>${location}</td>
          <td class="tbl_cell-product">${productName}</td>
          <td class="tbl_cell-barcode">${barcode}</td>
          <td class="tbl_text-right tbl_text-bold">${priceFormatted}</td>
          <td class="tbl_text-center">
            <span class="status-badge-container ${badgeClass}" data-i18n="${statusI18nKey}"></span>
          </td>
        </tr>
      `;
    });

    tableHTML += `</tbody></table>`;
    tableContainer.innerHTML = tableHTML;

    window.dispatchEvent(new Event("appandor_render_complete"));
  })
  .catch(err => {
    console.error("[Inventory UI Error]:", err.message);
    tableContainer.innerHTML = `<p class="tbl_text-bold tbl_msg-error" data-i18n="gen_ledger_error"></p>`;
    window.dispatchEvent(new Event("appandor_render_complete"));
  });
}

// =============================================================================
// Event Listener
// =============================================================================

window.addEventListener("appandor_platform_ready", ()   => { loadInventoryTable(); });
window.addEventListener('appandor_language_changed', () => { loadInventoryTable(); });
