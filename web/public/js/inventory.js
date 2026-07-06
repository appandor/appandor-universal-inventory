document.addEventListener("DOMContentLoaded", () => {
    const tableContainer = document.getElementById("inventory-table-container");
    if (!tableContainer) return;

    function loadInventoryTable() {
        let currentLang = localStorage.getItem('appandor_lang') || 'en';
        const token = localStorage.getItem('appandor_jwt_token');

        fetch(`lang/${currentLang}.json`)
            .then(res => res.json())
            .then(translations => {
                
                return fetch('/api/inventory', {
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
                                <tr style="border-bottom: 2px solid #444; color: #fff;">
                                    <th style="padding: 12px 8px;">${translations.tbl_box_id || 'Box ID'}</th>
                                    <th style="padding: 12px 8px;">${translations.tbl_storage_location || 'Storage Location'}</th>
                                    <th style="padding: 12px 8px;">${translations.tbl_product_name || 'Product Name'}</th>
                                    <th style="padding: 12px 8px;">${translations.tbl_barcode || 'Barcode'}</th>
                                    <th style="padding: 12px 8px; text-align: right;">${translations.tbl_price_gross || 'Price Gross'}</th>
                                    <th style="padding: 12px 8px; text-align: center;">${translations.tbl_logistics_status || 'Status'}</th>
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
                        
                        // SCHARFE KLASSEN-WEICHE STATT HÄSSLICHEM INLINE-CSS
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
                                    <!-- KORREKTUR: Verwendung der sauberen, zentralen CSS-Klassen -->
                                    <span class="status-badge-container ${badgeClass}">${statusText}</span>
                                </td>
                            </tr>
                        `;
                    });

                    tableHTML += `</tbody></table>`;
                    tableContainer.innerHTML = tableHTML;
                });
            })
            .catch(err => {
                console.error("[Inventory UI Error]:", err.message);
                tableContainer.innerHTML = `<p style="color: #c62828; font-weight: bold;">Error connecting to inventory ledger.</p>`;
            });
    }

    loadInventoryTable();

    window.addEventListener('appandor_language_changed', () => {
        loadInventoryTable();
    });
});
