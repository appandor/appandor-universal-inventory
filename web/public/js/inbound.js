// =============================================================================
// APPANDOR LOGISTICS: INBOUND TRANSACTION ENGINE (CRLF)
// =============================================================================

function loadInboundData() {
  const token = localStorage.getItem('appandor_jwt_token')
  const productSelect = document.getElementById("inbound-product-select")
  const tableContainer = document.getElementById("tbl_table-container")

  // 1. DROPDOWN BEFÜLLEN (PRODUKT-STAMMDATEN)
  if (productSelect) {
    fetch('/api/products/masters', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(products => {
      const prevVal = productSelect.value
      productSelect.innerHTML = ""
      if (!products || products.error || products.length === 0) {
        productSelect.innerHTML = `<option value="">No templates available</option>`
        return
      }
      products.forEach(p => {
        const opt = document.createElement("option")
        opt.value = p.product_id
        opt.innerText = p.name
        productSelect.appendChild(opt)
      })
      if (prevVal) productSelect.value = prevVal
    })
    .catch(err => console.error("[API Masters Error]:", err.message))
  }

  // 2. LIEFERUNGSDATEN HOLEN UND RENDERER ANSTEUERN
  if (tableContainer) {
    fetch('/api/inbound/purchases', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => { if (!res.ok) throw new Error("API stream failed"); return res.json() })
    .then(data => {
      if (typeof renderInboundTable === 'function') {
        renderInboundTable(data, tableContainer)
        if (typeof window.translatePage === "function") {
          window.translatePage()
        }
        window.dispatchEvent(new Event("appandor_render_complete"))
      }
    })
    .catch(err => {
      console.error("[UI Inbound Error]:", err.message)
      tableContainer.innerHTML = `<p class="tbl_text-bold tbl_msg-error" data-i18n="gen_ledger_error"></p>`
      window.dispatchEvent(new Event("appandor_render_complete"))
    })
  }
}

window.addEventListener("appandor_platform_ready", () => {
  loadInboundData()

  const inboundForm = document.getElementById("inbound-add-form")
  if (inboundForm) {
    inboundForm.addEventListener("submit", (e) => {
      e.preventDefault()
      const token = localStorage.getItem('appandor_jwt_token')
      const productSelect = document.getElementById("inbound-product-select")
      const dateInput = document.getElementById("inbound-date")
      const priceInput = document.getElementById("inbound-price")
      const errorEl = document.getElementById("inbound-error-message")

      // VALIDIERUNG: Pflichtfeld-Kontrolle
      if (!productSelect || !productSelect.value || !dateInput || !dateInput.value || !priceInput || !priceInput.value) {
        if (errorEl) {
          errorEl.setAttribute("data-i18n", "msg_error_required_fields")
          errorEl.style.display = "block"
          if (typeof window.translatePage === "function") window.translatePage()
          setTimeout(() => { errorEl.style.display = "none" }, 4000)
        }
        return
      }

      const payload = {
        product_id: productSelect.value,
        purchased_at: dateInput.value,
        purchase_price_gross: priceInput.value,
        quantity: parseInt(document.getElementById("inbound-quantity").value || 1),
        estimated_delivery: document.getElementById("inbound-delivery-est").value || null
      }

      fetch('/api/inbound/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      })
      .then(res => { if (!res.ok) throw new Error("Rejected"); return res.json();})
      .then(() => {
        document.getElementById("inbound-price").value = ""
        document.getElementById("inbound-quantity").value = "1"
        document.getElementById("inbound-delivery-est").value = ""
        loadInboundData()
      })
      .catch(err => console.error("[Form Error]:", err.message))
    })
  }

  // 4. TOGGLE MECHANISMUS FÜR DEN FORMULARKASTEN (SÄUBERUNG)
  const toggleHeader = document.getElementById("inbound-toggle-header")
  if (toggleHeader) {
    toggleHeader.addEventListener("click", () => {
      const form = document.getElementById("inbound-add-form")
      const btn = document.getElementById("inbound-toggle-btn")
      if (!form || !btn) return

      if (form.style.display === "none") {
        form.style.display = "flex"
        btn.setAttribute("data-i18n", "btn_collapse")
        btn.removeAttribute("data-state")
      } else {
        form.style.display = "none"
        btn.setAttribute("data-i18n", "btn_expand")
        btn.setAttribute("data-state", "collapsed")
      }      
      if (typeof window.translatePage === "function") window.translatePage()
    })
  }
})

// Event-Listener für Sprachwechsel sauber unten gebunden
window.addEventListener('appandor_language_changed', () => loadInboundData())