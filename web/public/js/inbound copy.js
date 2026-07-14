document.addEventListener("DOMContentLoaded", () => {
    const inboundForm = document.getElementById("inbound-add-form");
    const productSelect = document.getElementById("inbound-product-select");
    const container = document.getElementById("inbound-form-container");

    // Startet die Kette und holt die Rohdaten
    function loadInboundData() {
        const token = localStorage.getItem('appandor_jwt_token');

        // 1. Dropdown befüllen
        if (productSelect) {
            fetch('/api/products/masters', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(products => {
                const prevVal = productSelect.value;
                productSelect.innerHTML = "";
                if (!products || products.error || products.length === 0) {
                    productSelect.innerHTML = `<option value="">No templates available</option>`;
                    return;
                }
                products.forEach(p => {
                    const opt = document.createElement("option");
                    opt.value = p.product_id;
                    opt.innerText = p.name;
                    productSelect.appendChild(opt);
                });
                if (prevVal) productSelect.value = prevVal;
            })
            .catch(err => console.error("[API Masters Error]:", err.message));
        }

        // 2. Lieferungsdaten holen und an den Renderer übergeben
        if (container) {
            fetch('/api/inbound/purchases', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => { if (!res.ok) throw new Error("API stream failed"); return res.json(); })
            .then(data => {
                // Funktion aus der neuen inbound-render.js aufrufen
                if (typeof renderInboundTable === 'function') {
                    renderInboundTable(data, container);
                }
            })
            .catch(err => {
                console.error("[UI Inbound Error]:", err.message);
                container.innerHTML = `<p style="color: #c62828; padding: 15px;">Error loading data.</p>`;
            });
        }
    }

    loadInboundData();
    window.addEventListener('appandor_language_changed', () => loadInboundData());
    window.addEventListener('appandor_theme_changed', () => loadInboundData());

    // 3. Formular-Absendung
    if (inboundForm) {
        inboundForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const currentLang = localStorage.getItem('appandor_lang') || 'en';
            const token = localStorage.getItem('appandor_jwt_token');

            const productSelect = document.getElementById("inbound-product-select");
            const dateInput = document.getElementById("inbound-date");
            const priceInput = document.getElementById("inbound-price");

            // VALIDIERUNG: Wenn ein Pflichtfeld leer ist, zeigen wir die rote Zone
            if (!productSelect || !productSelect.value || !dateInput || !dateInput.value || !priceInput || !priceInput.value) {
                const errorEl = document.getElementById("inbound-error-message");
                
                fetch(`lang/${currentLang}.json`)
                    .then(res => res.json())
                    .then(translations => {
                        if (errorEl) {
                            errorEl.innerText = translations.msg_error_required_fields || "Please fill in all required fields.";
                            errorEl.style.display = "block";
                            
                            setTimeout(() => {
                                errorEl.style.display = "none";
                            }, 4000);
                        }
                    });
                return; // Stoppt das Abschicken
            }

            // Wenn alles ausgefüllt ist, Payload senden
            const payload = {
                product_id: productSelect.value,
                purchased_at: dateInput.value,
                purchase_price_gross: priceInput.value,
                quantity: parseInt(document.getElementById("inbound-quantity").value || 1),
                estimated_delivery: document.getElementById("inbound-delivery-est").value || null
            };

            fetch('/api/inbound/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            })
            .then(res => { if (!res.ok) throw new Error("Rejected"); return res.json(); })
            .then(() => {
                document.getElementById("inbound-price").value = "";
                document.getElementById("inbound-quantity").value = "1";
                document.getElementById("inbound-delivery-est").value = "";
                loadInboundData();
            })
            .catch(err => console.error("[Form Error]:", err.message));
        });
    }
});

        document.getElementById("inbound-toggle-header").addEventListener("click", () => {
            const form = document.getElementById("inbound-add-form");
            const btn = document.getElementById("inbound-toggle-btn");

            if (form.style.display === "none") {
                form.style.display = "flex";
                btn.setAttribute("data-i18n", "btn_collapse");
                btn.style.color = "#2e7d32";
            } else {
                form.style.display = "none";
                btn.setAttribute("data-i18n", "btn_expand");
                btn.style.color = "#fbc02d";
            }
            
            const currentLang = localStorage.getItem('appandor_lang') || 'en';
            fetch(`lang/${currentLang}.json`)
                .then(r => r.json())
                .then(t => {
                    const key = btn.getAttribute("data-i18n");
                    if (t[key]) btn.innerText = t[key];
                });
        });

