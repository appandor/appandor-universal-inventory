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
              <button class="btn-action-edit" data-id="${prod.product_id}" data-i18n="btn_edit"></button>
              <button class="btn-action-delete" data-id="${prod.product_id}" data-i18n="btn_delete"></button>
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
