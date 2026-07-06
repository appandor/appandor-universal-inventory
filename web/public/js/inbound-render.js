// ==========================================================================
// APPANDOR INBOUND: PURE HTML TABLE RENDERING WORKER
// ==========================================================================

window.renderInboundTable = function(data, targetContainer) {
    const currentLang = localStorage.getItem('appandor_lang') || 'en';

    fetch(`lang/${currentLang}.json`)
        .then(res => res.json())
        .then(translations => {
            if (!data || data.length === 0 || data.error) {
                targetContainer.innerHTML = `<p style="color: #888; font-style: italic; padding: 15px;">No transactions registered.</p>`;
                return;
            }

            let html = `
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-weight: bold;">
                            <th style="padding: 10px 8px;">${translations.tbl_purchase_date || 'Purchase Date'}</th>
                            <th style="padding: 10px 8px;">${translations.tbl_product_desc || 'Product Description'}</th>
                            <th style="padding: 10px 8px;">${translations.tbl_barcode || 'Barcode'}</th>
                            <th style="padding: 10px 8px; text-align: center;">${translations.tbl_quantity || 'Quantity'}</th>
                            <th style="padding: 10px 8px; text-align: right;">${translations.tbl_price_gross || 'Price Gross'}</th>
                            <th style="padding: 10px 8px;">${translations.tbl_estimated_delivery || 'Expected At'}</th>
                            <th style="padding: 10px 8px;">${translations.tbl_received_at || 'Delivered At'}</th>
                            <th style="padding: 10px 8px; text-align: center;">${translations.tbl_logistics_status || 'Logistics Status'}</th>
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
                const bgStyle = index % 2 === 0 ? 'background: var(--table-row-even);' : 'background: var(--table-row-odd);';

                let actionCellHTML = `<span class="status-badge-container ${badgeClass}">${statusText}</span>`;
                const actionBtnText = translations.btn_receive || "Confirm";

                if (row.status === 'ORDERED') {
                    const currentQty = row.quantity || 1;
                    actionCellHTML = `
                        <button class="btn-receive-action" onclick="openReceiveModal(${row.tracked_id}, ${currentQty})">
                            ${actionBtnText}
                        </button>
                    `;
                }

                html += `
                    <tr style="${bgStyle} border-bottom: 1px solid var(--border-color); color: var(--text-color);">
                        <td style="padding: 12px 8px; font-family: monospace;">${dateObj}</td>
                        <td style="padding: 12px 8px; font-weight: bold;">${row.product_name}</td>
                        <td style="padding: 12px 8px; font-family: monospace; color: var(--text-muted);">${row.barcode || '-'}</td>
                        <td style="padding: 12px 8px; text-align: center;"><strong style="font-family: monospace; font-size: 14px;">${row.quantity || 1}</strong></td>
                        <td style="padding: 12px 8px; text-align: right; font-weight: bold;">${priceFormatted}</td>
                        <td style="padding: 12px 8px; font-family: monospace; color: var(--text-muted);">${estDelivery}</td>
                        <td class="${stateClass}" style="padding: 12px 8px; font-family: monospace;">${receivedDate}</td>
                        <td style="padding: 12px 8px; text-align: center;">
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
