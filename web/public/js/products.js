// =============================================================================
// APPANDOR LOGISTICS: PRODUCT MASTER MANAGEMENT ENGINE (TABLE CRUD)
// =============================================================================

function renderProductsInterface() {
  const token = localStorage.getItem('appandor_jwt_token');
  const categoryDropdown = document.getElementById("category");
  const tableContainer = document.getElementById("tbl_table-container");
  if (!tableContainer) return;

  // 1. DROPDOWN BEFÜLLEN
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
        categoryDropdown.innerHTML = `<option value="" data-i18n="prod_msg_no_categories"></option>`;
        if (typeof window.translatePage === "function") window.translatePage();
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

  // 2. TABELLE RENDERN (REIN i18n-KONFORM — KEINE HARTEN TEXTE MEHR)
  fetch('/api/products/masters', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(products => {
    if (!products || products.length === 0 || products.error) {
      tableContainer.innerHTML = `<p class="tbl_msg-empty" data-i18n="loading_products_empty"></p>`;
      if (typeof window.translatePage === "function") window.translatePage();
      window.dispatchEvent(new Event("appandor_render_complete"));
      return;
    }

    let html = `
      <table class="tbl_table">
        <thead>
          <tr>
            <th data-i18n="prod_label_name"></th>
            <th data-i18n="prod_label_barcode"></th>
            <th data-i18n="prod_label_category"></th>
            <th class="tbl_text-right" data-i18n="prod_label_minstock"></th>
            <th class="tbl_text-center" data-i18n="tbl_action"></th>
          </tr>
        </thead>
        <tbody>
    `;

    products.forEach((prod, index) => {
      const rowClass = index % 2 === 0 ? 'tbl_row-even' : 'tbl_row-odd';
      const categoryName = prod.category_name || '-';
      const barcode = prod.barcode || '-';

      html += `
        <tr class="${rowClass}">
          <td class="tbl_cell-product" id="prod-name-${prod.product_id}" style="font-weight: bold; color: var(--text-color);">${prod.name}</td>
          <td class="tbl_cell-barcode" id="prod-barcode-${prod.product_id}">${barcode}</td>
          <td id="prod-category-${prod.product_id}" style="color: var(--text-muted); font-size: 13px;">${categoryName}</td>
          <td class="tbl_text-right tbl_text-bold" id="prod-stock-${prod.product_id}" style="color: #fbc02d;">${prod.minimum_stock} <span data-i18n="unit_pcs"></span></td>
          <td class="tbl_text-center">
            <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
              <button class="btn-receive-action action-trigger-edit" data-id="${prod.product_id}" data-i18n="btn_edit" style="width: auto; height: 28px; line-height: 28px; padding: 0 12px; font-size: 11px; text-transform: uppercase;"></button>
              <button class="btn-receive-action action-trigger-delete" data-id="${prod.product_id}" data-i18n="btn_delete" style="width: auto; height: 28px; line-height: 28px; padding: 0 12px; font-size: 11px; text-transform: uppercase; background-color: #c62828 !important;"></button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    tableContainer.innerHTML = html;

    if (typeof window.translatePage === "function") window.translatePage();
    window.dispatchEvent(new Event("appandor_render_complete"));
  })
  .catch(err => {
    console.error("[UI Products Render Error]:", err.message);
    tableContainer.innerHTML = `<p class="tbl_text-bold tbl_msg-error" data-i18n="gen_ledger_error"></p>`;
    window.dispatchEvent(new Event("appandor_render_complete"));
  });
}

// =============================================================================
// INITIALISIERUNG ÜBER DIE ZENTRALE LADEKETTE
// =============================================================================
window.addEventListener("appandor_platform_ready", () => {
  renderProductsInterface();

  const productForm = document.getElementById("product-form");
  const formTitle = document.getElementById("product-form-title");
  const submitBtn = document.getElementById("product-btn-submit");
  const cancelBtn = document.getElementById("product-btn-cancel");
  const hiddenIdInput = document.getElementById("product-id-hidden");

  if (productForm) {
    productForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const token = localStorage.getItem('appandor_jwt_token');

      const nameInput = document.getElementById("name");
      const barcodeInput = document.getElementById("barcode");
      const categorySelect = document.getElementById("category");
      const minStockInput = document.getElementById("minimum_stock");
      const isEditMode = hiddenIdInput.value !== "";

      const payload = {
        name: nameInput.value,
        barcode: barcodeInput.value,
        category_id: categorySelect.value,
        minimum_stock: minStockInput.value
      };

      const apiUrl = isEditMode ? `/api/products/update/${hiddenIdInput.value}` : '/api/products/add';
      const apiMethod = isEditMode ? 'PUT' : 'POST';

      fetch(apiUrl, {
        method: apiMethod,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      })
      .then(res => { if (!res.ok) throw new Error("Rejected"); return res.json(); })
      .then(() => {
        hiddenIdInput.value = "";
        nameInput.value = "";
        barcodeInput.value = "";
        minStockInput.value = "0";
        if (formTitle) formTitle.setAttribute("data-i18n", "prod_add_title");
        if (submitBtn) submitBtn.setAttribute("data-i18n", "prod_btn_save");
        if (cancelBtn) cancelBtn.style.display = "none";
        renderProductsInterface();
      })
      .catch(err => console.error("[Form Submit Error]:", err.message));
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      hiddenIdInput.value = "";
      document.getElementById("name").value = "";
      document.getElementById("barcode").value = "";
      document.getElementById("minimum_stock").value = "0";
      if (formTitle) formTitle.setAttribute("data-i18n", "prod_add_title");
      if (submitBtn) submitBtn.setAttribute("data-i18n", "prod_btn_save");
      cancelBtn.style.display = "none";
      if (typeof window.translatePage === "function") window.translatePage();
    });
  }

  const toggleHeader = document.getElementById("inbound-toggle-header");
  if (toggleHeader) {
    toggleHeader.addEventListener("click", () => {
      const form = document.getElementById("product-form");
      const btn = document.getElementById("inbound-toggle-btn");
      if (!form || !btn) return;

      if (form.style.display === "none") {
        form.style.display = "flex";
        btn.setAttribute("data-i18n", "btn_collapse");
        btn.removeAttribute("data-state");
      } else {
        form.style.display = "none";
        btn.setAttribute("data-i18n", "btn_expand");
        btn.setAttribute("data-state", "collapsed");
      }
      if (typeof window.translatePage === "function") window.translatePage();
    });
  }

  const tableContainer = document.getElementById("tbl_table-container");
  if (tableContainer) {
    tableContainer.addEventListener("click", (e) => {
      if (e.target && e.target.classList.contains("action-trigger-edit")) {
        const prodId = e.target.getAttribute("data-id");
        
        const name = document.getElementById(`prod-name-${prodId}`).innerText;
        const barcode = document.getElementById(`prod-barcode-${prodId}`).innerText;
        const stockText = document.getElementById(`prod-stock-${prodId}`).innerText.replace(" Stk", "").trim();

        hiddenIdInput.value = prodId;
        document.getElementById("name").value = name;
        document.getElementById("barcode").value = barcode === "-" ? "" : barcode;
        document.getElementById("minimum_stock").value = stockText;

        if (formTitle) formTitle.setAttribute("data-i18n", "prod_edit_title");
        if (submitBtn) submitBtn.setAttribute("data-i18n", "btn_modal_confirm");
        if (cancelBtn) cancelBtn.style.display = "block";

        const form = document.getElementById("product-form");
        const btn = document.getElementById("inbound-toggle-btn");
        if (form && form.style.display === "none") {
          form.style.display = "flex";
          if (btn) { btn.setAttribute("data-i18n", "btn_collapse"); btn.removeAttribute("data-state"); }
        }

        if (typeof window.translatePage === "function") window.translatePage();
      }
    });
  }
});

window.addEventListener('appandor_language_changed', () => renderProductsInterface());
