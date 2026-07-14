// =============================================================================
// APPANDOR LOGISTICS: PRODUCT MASTER MANAGEMENT ENGINE (CRLF)
// =============================================================================

function renderProductsInterface() {
  const token = localStorage.getItem('appandor_jwt_token');
  const categoryDropdown = document.getElementById("category");
  const productsContainer = document.getElementById("products-container");

  // 1. DYNAMISCHES KATEGORIE-DROPDOWN BEFÜLLEN
  if (categoryDropdown) {
    fetch('/api/products/categories', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(categories => {
      const prevSelected = categoryDropdown.value;
      categoryDropdown.innerHTML = "";
      
      if (!categories || categories.length === 0 || categories.error) {
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

  // 2. SCHARFE PRODUKT-STAMMDATENLISTE LADEN
  if (productsContainer) {
    fetch('/api/products/masters', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(products => {
      productsContainer.innerHTML = "";

      if (!products || products.length === 0 || products.error) {
        productsContainer.innerHTML = `<li class="tbl_msg-empty" style="list-style: none;" data-i18n="loading_products_empty">No product master templates registered.</li>`;
        if (typeof window.translatePage === "function") window.translatePage();
        window.dispatchEvent(new Event("appandor_render_complete"));
        return;
      }

      products.forEach(prod => {
        const li = document.createElement("li");
        li.className = "product-template-card";
        
        const catBadge = prod.category_name ? ` <span class="product-template-badge">${prod.category_name}</span>` : '';
        
        // Nutzt reine data-Attribute für die Übersetzungs-Engine!
        li.innerHTML = `
          <div>
            <strong style="color: var(--text-color); font-size: 15px;">${prod.name}</strong>${catBadge}
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px; font-family: monospace;">EAN: ${prod.barcode || '-'}</div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 2px;" data-i18n="prod_alert_at">Alert at:</span>
            <strong style="color: #fbc02d; font-family: monospace; display: block; font-size: 14px;">
              ${prod.minimum_stock} <span data-i18n="unit_pcs">pcs</span>
            </strong>
          </div>
        `;
        productsContainer.appendChild(li);
      });

      // Synchrones Übersetzen nach dem DOM-Aufbau
      if (typeof window.translatePage === "function") {
        window.translatePage();
      }
      // Vorhang auf! Das gesamte Grid ploppt zeitgleich auf
      window.dispatchEvent(new Event("appandor_render_complete"));
    })
    .catch(err => {
      console.error("[UI Products Error]:", err.message);
      productsContainer.innerHTML = `<li class="tbl_text-bold tbl_msg-error" style="list-style: none;" data-i18n="gen_ledger_error">Error connecting to product database.</li>`;
      window.dispatchEvent(new Event("appandor_render_complete"));
    });
  }
}

// =============================================================================
// INITIALISIERUNG ÜBER DIE ZENTRALE LADEKETTE
// =============================================================================
window.addEventListener("appandor_platform_ready", () => {
  renderProductsInterface();

  const productForm = document.getElementById("product-form");
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
          'Authorization': `Bearer ${token}`
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

// Event-Listener für Sprachwechsel sauber unten gebunden
window.addEventListener('appandor_language_changed', () => renderProductsInterface());
