document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("inbound-form-container");
    const inboundAddForm = document.getElementById("inbound-add-form");
    const productSelect = document.getElementById("inbound-product-select");

    const token = localStorage.getItem('appandor_jwt_token');
    
    // DIE LOGIK LÄDT NUR NOCH DIE STAMMDATEN-ARTIKEL IN DAS DROPDOWN
    if (productSelect) {
        fetch('/api/products/masters', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(products => {
            productSelect.innerHTML = "";
            if (products.length === 0 || products.error) {
                productSelect.innerHTML = `<option value="">Keine Artikelvorlagen vorhanden</option>`;
                return;
            }
            products.forEach(p => {
                const opt = document.createElement("option");
                opt.value = p.product_id;
                opt.innerText = p.name;
                productSelect.appendChild(opt);
            });
        })
        .catch(err => console.error("[UI Products Load Error]:", err.message));
    }

    // DIE OPERATIVE LIEFERLISTE RENDERN
    function loadInboundTable() {
        let currentLang = localStorage.getItem('appandor_lang') || 'en';

        fetch(`lang/${currentLang}.json`)
            .then(res => res.json())
            .then(translations => {
                return fetch('/api/inbound/purchases', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => { if (!res.ok) throw new Error("API failed"); return res.json(); })
                .then(data => {
                    if (!container) return;
                    if (data.length === 0 || data.error) {
                        container.innerHTML = `<p style="color: #888; font-style: italic;">No inbound tracking files available.</p>`;
                        return;
                    }

                    let html = `
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; text-align: left;">
                            <thead>
                                <tr style="border-bottom: 2px solid #444; color: #fff;">
                                    <th style="padding: 12px 8px;">${translations.tbl_purchase_date || 'Purchase Date'}</th>
                                    <th style="padding: 12px 8px;">${translations.tbl_product_desc || 'Product Description'}</th>
                                    <th style="padding: 12px 8px;">${translations.tbl_barcode || 'Barcode'}</th>
                                    <th style="padding: 12px 8px; text-align: right;">${translations.tbl_price_gross || 'Price Gross'}</th>
                                    <th style="padding: 12px 8px;">${translations.tbl_estimated_delivery || 'Expected'}</th>
                                    <th style="padding: 12px 8px;">${translations.tbl_received_at || 'Received At'}</th>
                                    <th style="padding: 12px 8px;">${translations.tbl_expiry_date || 'Expiry'}</th>
                                    <th style="padding: 12px 8px; text-align: center;">${translations.tbl_logistics_status || 'Logistics Status'}</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    data.forEach((row, index) => {
                        const dateObj = new Date(row.purchased_at).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US');
                        const priceFormatted = parseFloat(row.price).toFixed(2) + ' €';
                        
                        const estDelivery = row.estimated_delivery ? new Date(row.estimated_delivery).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US') : '-';
                        const receivedDate = row.received_at ? new Date(row.received_at).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US') : '-';
                        const expiryDate = row.expiry_date ? new Date(row.expiry_date).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US') : '-';
                        
                        const statusKey = "status_" + row.status.toLowerCase();
                        const statusText = translations[statusKey] || row.status;
                        
                        const stateClass = "status-text-" + row.status.toLowerCase();
                        const badgeClass = row.status === 'RECEIVED' ? 'badge-received' : 'badge-ordered';
                        const bgStyle = index % 2 === 0 ? 'background: var(--table-row-even);' : 'background: var(--table-row-odd);';

                        html += `
                            <tr style="${bgStyle} border-bottom: 1px solid #333; color: #ccc;">
                                <td style="padding: 12px 8px; font-family: monospace;">${dateObj}</td>
                                <td style="padding: 12px 8px; color: #fff; font-weight: bold;">${row.product_name}</td>
                                <td style="padding: 12px 8px; font-family: monospace; color: var(--text-muted);">${row.barcode || '-'}</td>
                                <td style="padding: 12px 8px; text-align: right; font-weight: bold;">${priceFormatted}</td>
                                <td style="padding: 12px 8px; font-family: monospace; color: var(--text-muted);">${estDelivery}</td>
                                <td class="${stateClass}" style="padding: 12px 8px; font-family: monospace;">${receivedDate}</td>
                                <td style="padding: 12px 8px; font-family: monospace; color: #e57373;">${expiryDate}</td>
                                <td style="padding: 12px 8px; text-align: center;">
                                    <span class="status-badge-container ${badgeClass}">${statusText}</span>
                                </td>
                            </tr>
                        `;
                    });

                    html += `</tbody></table>`;
                    container.innerHTML = html;
                });
            })
            .catch(err => {
                console.error("[UI Inbound Error]:", err.message);
                if (container) container.innerHTML = `<p style="color: #c62828; font-weight: bold;">Error connecting to inbound log files.</p>`;
            });
    }

    loadInboundTable();

    window.addEventListener('appandor_language_changed', () => {
        loadInboundTable();
    });

    if (inboundAddForm) {
        inboundAddForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const payload = {
                product_id: productSelect ? productSelect.value : null,
                purchased_at: document.getElementById("inbound-date").value,
                purchase_price_gross: document.getElementById("inbound-price").value,
                estimated_delivery: document.getElementById("inbound-delivery-est").value
            };

            fetch('/api/inbound/add', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (!res.ok) throw new Error("Database rejected purchase entry");
                return res.json();
            })
            .then(() => {
                document.getElementById("inbound-price").value = "";
                document.getElementById("inbound-delivery-est").value = "";
                loadInboundTable();
            })
            .catch(err => alert(err.message));
        });
    }
});
