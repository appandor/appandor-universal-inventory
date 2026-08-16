// ==========================================================================
// INBOUND: HTML DYNAMIC DATA RENDERING
// ==========================================================================

window.renderInboundTable = function(data, targetContainer) {
  if (!data || data.length === 0 || data.error) {
    targetContainer.innerHTML = `<p class="tbl_msg-empty" data-i18n="loading_inbound_empty"></p>`
    return
  }

  // Wir speichern die Rohdaten global im window-Objekt, damit die Klick-Events darauf zugreifen können
  window.currentInboundTableData = data;

  let html = `
    <table class="tbl_table">
      <thead>
        <tr>
          <th data-i18n="tbl_purchase_date"></th>
          <th data-i18n="tbl_product_desc"></th>
          <th data-i18n="tbl_barcode"></th>
          <th class="tbl_text-center" data-i18n="tbl_quantity"></th>
          <th class="tbl_text-right" data-i18n="tbl_price_gross"></th>
          <th data-i18n="tbl_estimated_delivery"></th>
          <th data-i18n="tbl_received_at"></th>
          <th class="tbl_text-center" data-i18n="tbl_logistics_status"></th>
        </tr>
      </thead>
      <tbody>
  `

  data.forEach((row, index) => {
    // Formatiert das Datum systemspezifisch
    const dateObj = new Date(row.purchased_at).toLocaleDateString()
    const priceFormatted = parseFloat(row.price || 0).toFixed(2) + ' €'
    const estDelivery = row.estimated_delivery ? new Date(row.estimated_delivery).toLocaleDateString() : '-'
    const receivedDate = row.received_at ? new Date(row.received_at).toLocaleDateString() : '-'
    
    const statusI18nKey = "status_" + row.status.toLowerCase()
    const rowClass = index % 2 === 0 ? 'tbl_row-even' : 'tbl_row-odd'

    // Nutzt jetzt deine neuen, konsolidierten CSS-Button-Klassen für den Status
    let actionCellHTML = `<span class="btn btn-success" data-i18n="${statusI18nKey}"></span>`

    if (row.status === 'ORDERED') {
      actionCellHTML = `
        <button class="btn btn-confirm js-inbound-receive-trigger" data-index="${index}" data-i18n="btn_receive"></button>
      `
    }

    html += `
      <tr class="${rowClass}">
        <td style="font-family: monospace;">${dateObj}</td>
        <td class="tbl_text-bold">${row.product_name}</td>
        <td style="font-family: monospace; color: var(--text-muted);">${row.barcode || '-'}</td>
        <td class="tbl_text-center"><strong style="font-family: monospace; font-size: 14px;">${row.quantity || 1}</strong></td>
        <td class="tbl_text-right tbl_text-bold">${priceFormatted}</td>
        <td style="font-family: monospace; color: var(--text-muted);">${estDelivery}</td>
        <td style="font-family: monospace;">${receivedDate}</td>
        <td class="tbl_text-center">
          ${actionCellHTML}
        </td>
      </tr>
    `
  })

  html += `</tbody></table>`
  targetContainer.innerHTML = html

  // Event-Listener dynamisch an die gerenderten Buttons binden
  const buttons = targetContainer.querySelectorAll(".js-inbound-receive-trigger")
  buttons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.getAttribute("data-index")
      const selectedOrder = window.currentInboundTableData[idx]
      
      if (selectedOrder) {
        // Feuert den Event an js/inbound-receive.js ab
        window.dispatchEvent(new CustomEvent("appandor_trigger_inline_receive", {
          detail: { order: selectedOrder }
        }))
      }
    })
  })
}
