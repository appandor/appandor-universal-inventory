// ==========================================================================
// APPANDOR INBOUND: PURE HTML TABLE RENDERING WORKER
// ==========================================================================

window.renderInboundTable = function(data, targetContainer) {
  const currentLang = localStorage.getItem('appandor_lang') || 'en';

  fetch(`lang/${currentLang}.json`)
    .then(res => res.json())
    .then(translations => {
      if (!data || data.length === 0 || data.error) {
        // FIX: Nutzt jetzt die globale, zentrierte Leer-Klasse aus tables.css
        targetContainer.innerHTML = `<p class="tbl_msg-empty">${translations.gen_no_transactions || 'No transactions registered.'}</p>`;
        return;
      }

      // FIX: Keine Inline-Styles mehr! Tabelle nutzt jetzt die Klasse tbl_table
      let html = `
        <table class="tbl_table">
          <thead>
            <tr>
              <th>${translations.tbl_purchase_date || 'Purchase Date'}</th>
              <th>${translations.tbl_product_desc || 'Product Description'}</th>
              <th>${translations.tbl_barcode || 'Barcode'}</th>
              <th class="tbl_text-center">${translations.tbl_quantity || 'Quantity'}</th>
              <th class="tbl_text-right">${translations.tbl_price_gross || 'Price Gross'}</th>
              <th>${translations.tbl_estimated_delivery || 'Expected At'}</th>
              <th>${translations.tbl_received_at || 'Delivered At'}</th>
              <th class="tbl_text-center">${translations.tbl_logistics_status || 'Logistics Status'}</th>
            </tr>
          </thead>
          <tbody>
      `;

      data.forEach((row, index) => {
        const dateObj = new Date(row.purchased_at).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US');
        const priceFormatted = parseFloat(row.price || 0).toFixed(2) + ' €';
        const estDelivery = row.estimated_delivery ? new Date(row.estimated_delivery).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US') : '-';
        const receivedDate = row.received_at ? new Date(row.received_at).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US') : '-';
        
        const statusKey = "status_" + row.status.toLowerCase();
        const statusText = translations[statusKey] || row.status;
        
        const stateClass = "status-text-" + row.status.toLowerCase();
        const badgeClass = row.status === 'RECEIVED' ? 'badge-received' : 'badge-ordered';
        
        // Die Zeilen-Klassen fluchten nun synchron mit dem unbestechlichen tables.css-Wechsel
        const rowClass = index % 2 === 0 ? 'tbl_row-even' : 'tbl_row-odd';

        let actionCellHTML = `<span class="status-badge-container ${badgeClass}">${statusText}</span>`;
        const actionBtnText = translations.btn_receive || "Confirm";

        if (row.status === 'ORDERED') {
          const currentQty = row.quantity || 1;
          actionCellHTML = `
            <button class="btn-receive-action" onclick="openReceiveModal(${row.tracked_id}, ${currentQty}, ${row.product_id})">
              ${actionBtnText}
            </button>
          `;
        }

        // FIX: Alle harten td Inline-Styles restlos entfernt!
        html += `
          <tr class="${rowClass}">
            <td style="font-family: monospace;">${dateObj}</td>
            <td class="tbl_text-bold">${row.product_name}</td>
            <td style="font-family: monospace; color: var(--text-muted);">${row.barcode || '-'}</td>
            <td class="tbl_text-center"><strong style="font-family: monospace; font-size: 14px;">${row.quantity || 1}</strong></td>
            <td class="tbl_text-right tbl_text-bold">${priceFormatted}</td>
            <td style="font-family: monospace; color: var(--text-muted);">${estDelivery}</td>
            <td class="${stateClass}" style="font-family: monospace;">${receivedDate}</td>
            <td class="tbl_text-center">
              ${actionCellHTML}
            </td>
          </tr>
        `;
      });

      html += `</tbody></table>`;
      targetContainer.innerHTML = html;
    })
    .catch(err => console.error("[Render Error]:", err.message));
};
