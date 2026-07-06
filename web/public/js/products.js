document.addEventListener("DOMContentLoaded", () => {
    
    const productForm = document.getElementById("product-form");
    const categoryDropdown = document.getElementById("category");
    const productsContainer = document.getElementById("products-container");

    function renderProductsInterface() {
        let currentLang = localStorage.getItem('appandor_lang') || 'en';
        const token = localStorage.getItem('appandor_jwt_token');

        fetch(`lang/${currentLang}.json`)
            .then(res => res.json())
            .then(translations => {
                
                // Dynamisches Kategorie-Dropdown befüllen (Mit echtem Token!)
                if (categoryDropdown) {
                    fetch('/api/products/categories', {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    .then(res => res.json())
                    .then(categories => {
                        const prevSelected = categoryDropdown.value;
                        categoryDropdown.innerHTML = "";
                        
                        if (categories.length === 0 || categories.error) {
                            categoryDropdown.innerHTML = `<option value="">No categories defined</option>`;
                            return;
                        }
                        categories.forEach(cat => {
                            const option = document.createElement("option");
                            option.value = cat.category_id;
                            option.innerText = cat.display_name;
                            categoryDropdown.appendChild(option);
                        });
                        if (prevSelected) { categoryDropdown.value = prevSelected; }
                    })
                    .catch(err => console.error("[UI Categories Error]:", err.message));
                }

                // Scharfe Produkt-Stammdatenliste laden (Mit echtem Token!)
                if (productsContainer) {
                    fetch('/api/products/masters', {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    .then(res => res.json())
                    .then(products => {
                        productsContainer.innerHTML = "";

                        if (products.length === 0 || products.error) {
                            productsContainer.innerHTML = `<li style="color: #888; font-style: italic; list-style: none;">No product master templates registered.</li>`;
                            return;
                        }

                        products.forEach(prod => {
                            const li = document.createElement("li");
                            li.style.cssText = "background: #1e1e1e; padding: 15px; margin-bottom: 10px; border-radius: 4px; border-left: 4px solid #2e7d32; list-style: none; display: flex; justify-content: space-between; align-items: center;";
                            
                            const catBadge = prod.category_name ? ` <span style="background: #2a2a2a; color: #888; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 5px;">${prod.category_name}</span>` : '';
                            
                            const alertText = translations.prod_alert_at || "Alert at:";
                            const unitText = translations.unit_pcs || "pcs";

                            li.innerHTML = `
                                <div>
                                    <strong style="color: #fff; font-size: 15px;">${prod.name}</strong>${catBadge}
                                    <div style="font-size: 12px; color: #888; margin-top: 4px; font-family: monospace;">EAN: ${prod.barcode || '-'}</div>
                                </div>
                                <div style="text-align: right;">
                                    <span style="font-size: 11px; color: var(--text-muted);">${alertText}</span>
                                    <strong style="color: #fbc02d; font-family: monospace; display: block; font-size: 14px;">${prod.minimum_stock} ${unitText}</strong>
                                </div>
                            `;
                            productsContainer.appendChild(li);
                        });
                    })
                    .catch(err => {
                        console.error("[UI Products Error]:", err.message);
                        productsContainer.innerHTML = `<li style="color: #c62828; font-weight: bold; list-style: none;">Error connecting to product database.</li>`;
                    });
                }
            });
    }

    renderProductsInterface();

    window.addEventListener('appandor_language_changed', () => {
        renderProductsInterface();
    });

    if (productForm) {
        productForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const token = localStorage.getItem('appandor_jwt_token');

            const nameInput = document.getElementById("name");
            const barcodeInput = document.getElementById("barcode");
            const categorySelect = document.getElementById("category");
            const minStockInput = document.getElementById("minimum_stock");

            const payload = {
                name: nameInput.value,
                barcode: barcodeInput.value,
                category_id: categorySelect.value,
                minimum_stock: minStockInput.value
            };

            fetch('/api/products/add', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // SCHARFE TOKEN-ÜBERGABE BEIM SPEICHERN!
                },
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (!res.ok) throw new Error("Failed to store data on server");
                return res.json();
            })
            .then(data => {
                nameInput.value = "";
                barcodeInput.value = "";
                minStockInput.value = "0";
                renderProductsInterface();
            })
            .catch(err => {
                console.error("[Form Submit Error]:", err.message);
                alert("Error: Database rejected product entry.");
            });
        });
    }
});
