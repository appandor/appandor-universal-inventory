document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("outbound-form-container");
    if (!container) return;

    function loadOutboundTable() {
        let currentLang = localStorage.getItem('appandor_lang') || 'en';
        const token = localStorage.getItem('appandor_jwt_token');

        fetch(`lang/${currentLang}.json`)
            .then(res => res.json())
            .then(translations => {
                
                return fetch('/api/outbound/active-boxes', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => { if (!res.ok) throw new Error("API failed"); return res.json(); })
                .then(data => {
                    if (data.length === 0 || data.error) {
                        container.innerHTML = `<p style="color: #888; font-style: italic;">No active boxed assets available for outbound fulfillment.</p>`;
                        return;
                    }

                    let html = `
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; text-align: left;">
                            <thead>
                                <tr style="border-bottom: 2px solid #444; color: #fff;">
                                    <th style="padding: 12px 8px;">${translations.tbl_box_id || 'Box ID'}</th>
                                    <th style="padding: 12px 8px;">${translations.tbl_storage_location || 'Storage Location'}</th>
                                    <th style="padding: 12px 8px;">${translations.tbl_product_name || 'Product Name'}</th>
                                    <th style="padding: 12px 8px;">${translations.tbl_barcode || 'Barcode'}</th>
                                    <th style="padding: 12px 8px; text-align: right;">${translations.tbl_price_gross || 'Price Gross'}</th>
                                    <th style="padding: 12px 8px; text-align: center;">${translations.tbl_action || 'Action'}</th>
                                </tr>
                            </thead>
                            <tbody>
                        `;

                    data.forEach((row, index) => {
                        const priceFormatted = row.price ? parseFloat(row.price).toFixed(2) + ' €' : '-';
                        const bgStyle = index % 2 === 0 ? 'background: var(--table-row-even);' : 'background: var(--table-row-odd);';

                        html += `
                            <tr style="${bgStyle} border-bottom: 1px solid #333; color: #ccc;">
                                <td style="padding: 12px 8px; font-family: monospace; font-weight: bold; color: var(--success-color);">${row.box_id}</td>
                                <td style="padding: 12px 8px;">${row.storage_location || 'Unpositioned'}</td>
                                <td style="padding: 12px 8px; color: #fff; font-weight: bold;">${row.product_name}</td>
                                <td style="padding: 12px 8px; font-family: monospace; color: var(--text-muted);">${row.barcode || '-'}</td>
                                <td style="padding: 12px 8px; text-align: right; font-weight: bold;">${priceFormatted}</td>
                                <td style="padding: 12px 8px; text-align: center;">
                                    <!-- KORREKTUR: Keine Inline-Styles! Button nutzt eine kompakte, feine CSS-Reihe aus Ihrer style.css -->
                                    <button class="outbound-action-btn" style="width: auto; margin: 0; padding: 4px 12px; font-size: 11px; text-transform: uppercase;">
                                        ${translations.btn_fulfill || 'Fulfill'}
                                    </button>
                                </td>
                            </tr>
                        `;
                    });

                    html += `</tbody></table>`;
                    container.innerHTML = html;
                });
            })
            .catch(err => {
                console.error("[UI Outbound Error]:", err.message);
                container.innerHTML = `<p style="color: #c62828; font-weight: bold;">Error connecting to outbound ledger files.</p>`;
            });
    }

    loadOutboundTable();

    window.addEventListener('appandor_language_changed', () => {
        loadOutboundTable();
    });
});
