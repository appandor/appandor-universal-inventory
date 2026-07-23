// =============================================================================
// APPANDOR LOGISTICS: PRODUCT MASTER MANAGEMENT ENGINE
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

        document.getElementById("tbl_table-container").classList.remove("tbl_table-blocked");
        renderProductsInterface();
      })
      .catch(err => console.error("[Form Submit Error]:", err.message));
    });

    // LIVE-WÄCHTER: Schaltet den Speichern-Button bei Änderungen frei
    productForm.addEventListener("input", () => {
      const prodId = document.getElementById("product-id-hidden").value;
      
      // Beim Neuanlegen eines Produkts (keine ID vorhanden) bleibt der Button immer aktiv
      if (!prodId) {
        document.getElementById("product-btn-submit").disabled = false;
        return;
      }

      // Live-Werte aus den Eingabefeldern
      const currentName = document.getElementById("name").value.trim();
      const currentBarcode = document.getElementById("barcode").value.trim();
      const currentMinStock = parseInt(document.getElementById("minimum_stock").value, 10) || 0;

      // Ursprüngliche Werte aus der blockierten Tabellenzeile
      const origName = document.getElementById(`prod-name-${prodId}`).innerText.trim();
      const origBarcode = document.getElementById(`prod-barcode-${prodId}`).innerText.trim();
      const origStockText = document.getElementById(`prod-stock-${prodId}`).innerText.replace(/[a-zA-Z\s.]/g, "").trim();
      const origMinStock = parseInt(origStockText, 10) || 0;

      // Echtzeit-Vergleich
      const hasChanged = currentName !== origName || 
                        currentBarcode !== (origBarcode === "-" ? "" : origBarcode) || 
                        currentMinStock !== origMinStock;

      // Schaltet den Button frei, sobald sich ein Wert unterscheidet
      document.getElementById("product-btn-submit").disabled = !hasChanged;
    });
    // Wächter für das Kategorie-Dropdown
    const categorySelect = document.getElementById("category");
    if (categorySelect) {
      categorySelect.addEventListener("change", () => {
        const prodId = document.getElementById("product-id-hidden").value;
        if (prodId) {
          // Schaltet den Button sofort frei, wenn eine andere Kategorie gewählt wird
          document.getElementById("product-btn-submit").disabled = false;
        }
      });
    }

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
      document.getElementById("tbl_table-container").classList.remove("tbl_table-blocked");

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
      // PRÜFUNG AUF EDIT-BUTTON
      if (e.target && e.target.classList.contains("btn-action-edit")) {

        document.getElementById("tbl_table-container").classList.add("tbl_table-blocked");        
        document.getElementById("product-btn-submit").disabled = true;

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
        if (cancelBtn) cancelBtn.style.display = "inline-block";

        const form = document.getElementById("product-form");
        const btn = document.getElementById("inbound-toggle-btn");
        if (form && form.style.display === "none") {
          form.style.display = "flex";
          if (btn) { btn.setAttribute("data-i18n", "btn_collapse"); btn.removeAttribute("data-state"); }
        }

        if (typeof window.translatePage === "function") window.translatePage();
      }

      // PRÜFUNG AUF DELETE-BUTTON
      if (e.target && e.target.classList.contains("btn-action-delete")) {
        const prodId = e.target.getAttribute("data-id")
        const token = localStorage.getItem('appandor_jwt_token')

        if (!confirm("Produkt wirklich unwiderruflich löschen?")) return

        fetch(`/api/products/delete/${prodId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => { if (!res.ok) throw new Error("Delete failed"); return res.json(); })
        .then(() => {
          renderProductsInterface()
        })
        .catch(err => console.error("[Delete Action Error]:", err.message))
      }

    });
  }
});

window.addEventListener('appandor_language_changed', () => renderProductsInterface());
