// =============================================================================
// APPANDOR LOGISTICS: OUTBOUND TRANSACTION ENGINE (CRLF)
// =============================================================================

function loadOutboundTable() {
  const token = localStorage.getItem('appandor_jwt_token');
  // KORREKTUR: Greift nun unbestechlich nach der neuen universellen Tabellen-ID
  const tableContainer = document.getElementById("tbl_table-container");
  if (!tableContainer) return;

  fetch('/api/outbound/active-boxes', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => { if (!res.ok) throw new Error("API failed"); return res.json(); })
  .then(data => {
    if (data.length === 0 || data.error) {
      // KORREKTUR: Keine Inline-Styles, Nutzung der globalen Leer-Klasse
      tableContainer.innerHTML = `<p class="tbl_msg-empty" data-i18n="desc_outbound_empty">No active boxed assets available for outbound fulfillment.</p>`;
      if (typeof window.translatePage === "function") window.translatePage();
      window.dispatchEvent(new Event("appandor_render_complete"));
      return;
    }

    // UNBESTECHLICH: Reines HTML gekoppelt an deine universelle table.css Konvention!
    let html = `
      <table class="tbl_table">
        <thead>
          <tr>
            <th data-i18n="tbl_box_id"></th>
            <th data-i18n="tbl_storage_location"></th>
            <th data-i18n="tbl_product_name"></th>
            <th data-i18n="tbl_barcode"></th>
            <th class="tbl_text-right" data-i18n="tbl_price_gross"></th>
            <th class="tbl_text-center" data-i18n="tbl_action"></th>
          </tr>
        </thead>
        <tbody>
    `;

    data.forEach((row, index) => {
      const priceFormatted = row.price ? parseFloat(row.price).toFixed(2) + ' €' : '-';
      const rowClass = index % 2 === 0 ? 'tbl_row-even' : 'tbl_row-odd';

      html += `
        <tr class="${rowClass}">
          <td class="tbl_cell-box-id">${row.box_id}</td>
          <td>${row.storage_location || 'Unpositioned'}</td>
          <td class="tbl_cell-product">${row.product_name}</td>
          <td class="tbl_cell-barcode">${row.barcode || '-'}</td>
          <td class="tbl_text-right tbl_text-bold">${priceFormatted}</td>
          <td class="tbl_text-center">
            <!-- KORREKTUR: Nutzt jetzt eure globale Action-Button-Klasse aus der components.css -->
            <button class="btn-receive-action" data-i18n="btn_fulfill" data-box-id="${row.box_id}">
              Fulfill
            </button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    tableContainer.innerHTML = html;

    // Nach dem erfolgreichen Rendern der Tabelle die Übersetzungs-Engine rufen
    if (typeof window.translatePage === "function") {
      window.translatePage();
    }
    
    // Das finale Signal senden, damit das synchrone Einblenden zündet!
    window.dispatchEvent(new Event("appandor_render_complete"));
  })
  .catch(err => {
    console.error("[UI Outbound Error]:", err.message);
    tableContainer.innerHTML = `<p class="tbl_text-bold tbl_msg-error" data-i18n="gen_ledger_error"></p>`;
    window.dispatchEvent(new Event("appandor_render_complete"));
  });
}

// =============================================================================
// INITIALISIERUNG ÜBER DIE ZENTRALE LADEKETTE
// =============================================================================
window.addEventListener("appandor_platform_ready", () => {
  loadOutboundTable();
  
  // Platz für spätere Event-Listener (z.B. Klick auf den Fulfill-Button)
  const tableContainer = document.getElementById("tbl_table-container");
  if (tableContainer) {
    tableContainer.addEventListener("click", (e) => {
      if (e.target && e.target.classList.contains("btn-receive-action")) {
        const boxId = e.target.getAttribute("data-box-id");
        console.log(`[Outbound]: Starte Fulfill-Prozess für Box-ID: ${boxId}`);
        // Hier dockt später deine Fulfill-Logik an!
      }
    });
  }
});

// Event-Listener für Sprachwechsel sauber unten gebunden
window.addEventListener('appandor_language_changed', () => loadOutboundTable());