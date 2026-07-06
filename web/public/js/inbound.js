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

                    // KORREKTUR: MHD entfernt, Fokus rein auf kaufmännische Menge und Status!
                    let html = `
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                            <thead>
                                <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-weight: bold;">
                                    <th style="padding: 10px 8px;" data-i18n="tbl_purchase_date">Kaufdatum</th>
                                    <th style="padding: 10px 8px;" data-i18n="tbl_product_desc">Artikelbezeichnung</th>
                                    <th style="padding: 10px 8px;" data-i18n="tbl_barcode">Barcode</th>
                                    <th style="padding: 10px 8px; text-align: center;">Menge</th>
                                    <th style="padding: 10px 8px; text-align: right;" data-i18n="tbl_price_gross">EK Brutto</th>
                                    <th style="padding: 10px 8px;" data-i18n="tbl_estimated_delivery">Erwartet am</th>
                                    <th style="padding: 10px 8px;" data-i18n="tbl_received_at">Geliefert am</th>
                                    <th style="padding: 10px 8px; text-align: center;" data-i18n="tbl_logistics_status">Logistik-Status</th>
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
                        let quantityDisplay = `<strong style="font-family: monospace; font-size: 14px;">${row.quantity || 1}</strong>`;

                        if (row.status === 'ORDERED') {
                            const currentQty = row.quantity || 1;
                            quantityDisplay = `
                                <div style="display: flex; align-items: center; gap: 4px; justify-content: center;">
                                    <input type="number" id="receive-qty-${row.tracked_id}" min="1" max="${currentQty}" value="${currentQty}" style="width: 45px; padding: 4px; background: var(--card-bg); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 4px; text-align: center; font-weight: bold; font-family: monospace;">
                                    <span style="color: var(--text-muted); font-size: 11px;">/ ${currentQty}</span>
                                </div>
                            `;
                            actionCellHTML = `
                                <button class="btn-receive-action" onclick="executeInboundReceipt(${row.tracked_id}, ${currentQty})" style="padding: 5px 12px; background: #2e7d32; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px; transition: background 0.2s;">
                                    ✓ Buchung
                                </button>
                            `;
                        }

                        // KORREKTUR: MHD td-Zelle komplett entfernt!
                        html += `
                            <tr style="${bgStyle} border-bottom: 1px solid var(--border-color); color: var(--text-color);">
                                <td style="padding: 12px 8px; font-family: monospace;">${dateObj}</td>
                                <td style="padding: 12px 8px; font-weight: bold;">${row.product_name}</td>
                                <td style="padding: 12px 8px; font-family: monospace; color: var(--text-muted);">${row.barcode || '-'}</td>
                                <td style="padding: 12px 8px; text-align: center;">${quantityDisplay}</td>
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
                    tableContainer.innerHTML = html;

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
