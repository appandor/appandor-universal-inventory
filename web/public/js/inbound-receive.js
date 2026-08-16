// =============================================================================
// APPANDOR LOGISTICS: INBOUND RECEIVE CONTROLLER (CRLF)
// =============================================================================

let currentMaxQty = 0; // Merker für die aktuell ausgewählte Maximalmenge

// PUNKT 1A: STATISCHE REGALPLÄTZE DIREKT BEIM START AUS API LADEN
function loadLocationSuggestions() {
  const token = localStorage.getItem('appandor_jwt_token');
  const locationDatalist = document.getElementById("location-suggestions");

  if (locationDatalist) {
    fetch('/api/inbound/locations-list', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(locations => {
      locationDatalist.innerHTML = "";
      if (!locations || locations.error || !Array.isArray(locations)) return;
      locations.forEach(loc => {
        const option = document.createElement("option");
        option.value = loc.location_code; // z.B. LOC-OB-REGAL-A1
        // Nutzt deine exakte Beschriftungs-Logik aus dem alten Modal
        const text = `${loc.site || ''} — ${loc.zone || ''} (${loc.slot || ''})`;
        option.setAttribute("label", text);
        locationDatalist.appendChild(option);
      });
    })
    .catch(err => console.error("[API Locations Error]:", err.message));
  }
}

// PUNKT 1B: PRODUKTABHÄNGIGE BOXEN ERST BEIM KLICK AUF EINBUCHEN LADEN
function loadBoxSuggestions(productId) {
  const token = localStorage.getItem('appandor_jwt_token');
  const boxDatalist = document.getElementById("box-suggestions");

  if (boxDatalist && productId) {
    fetch(`/api/inbound/boxes-list/${productId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(boxes => {
      boxDatalist.innerHTML = "";
      if (!boxes || boxes.error || !Array.isArray(boxes)) return;
      boxes.forEach(box => {
        const option = document.createElement("option");
        option.value = box.box_id; // z.B. APP-BOX-001
        boxDatalist.appendChild(option);
      });
    })
    .catch(err => console.error("[API Boxes Error]:", err.message));
  }
}

// Schaltet den oberen Bereich komplett zurück auf das Bestell-Formular
function resetInboundControlCard() {
  const cardTitle = document.getElementById("inbound-card-title")
  const orderForm = document.getElementById("inbound-order-form")
  const receiveForm = document.getElementById("inbound-receive-form")
  const toggleBtn = document.getElementById("inbound-toggle-btn")

  if (cardTitle) cardTitle.setAttribute("data-i18n", "inbound_form_title")
  if (orderForm) orderForm.style.display = "flex"
  if (receiveForm) {
    receiveForm.style.display = "none"
    receiveForm.reset()
  }
  if (toggleBtn) {
    toggleBtn.setAttribute("data-i18n", "btn_collapse")
    toggleBtn.removeAttribute("data-state")
  }
  if (typeof window.translatePage === "function") window.translatePage()
}

// Überwacht die eingegebene Einbuchungsmenge und steuert die Backorder-Zone
function handleQtyInput(value) {
  const backorderZone = document.getElementById("inbound-receive-backorder-zone")
  const backorderText = document.getElementById("inbound-receive-backorder-text")
  const actualQty = parseInt(value) || 0

  if (!backorderZone || !backorderText) return

  if (actualQty < currentMaxQty && actualQty > 0) {
    const diff = currentMaxQty - actualQty
    backorderZone.style.display = "block"
    backorderText.innerText = `Restliche Menge von ${diff} Stk. als offen behalten (Nachlieferung)?`
  } else {
    backorderZone.style.display = "none"
  }
}

// Bereitet den oberen Bereich auf das Einbuchen vor, sobald in der Tabelle geklickt wird
function openInlineReceiveForm(orderData) {
  const cardTitle = document.getElementById("inbound-card-title")
  const orderForm = document.getElementById("inbound-order-form")
  const receiveForm = document.getElementById("inbound-receive-form")
  const toggleBtn = document.getElementById("inbound-toggle-btn")

  if (!receiveForm || !orderForm) return

  // 1. Formulare fliegend tauschen
  orderForm.style.display = "none"
  receiveForm.style.display = "block"

  // 2. Header-Titel anpassen und Aufklapp-Button fixieren
  if (cardTitle) cardTitle.setAttribute("data-i18n", "inbound_form_receive_title")
  if (toggleBtn) {
    toggleBtn.setAttribute("data-i18n", "btn_collapse")
    toggleBtn.removeAttribute("data-state")
  }

  // 3. Zeilendaten in die Formularfelder injizieren
  currentMaxQty = parseInt(orderData.quantity_open || orderData.quantity || 0)
  
  document.getElementById("inbound-receive-id").value = orderData.inbound_id || ""
  document.getElementById("inbound-receive-product-title").innerText = orderData.product_name || "Unknown Product"
  document.getElementById("inbound-receive-meta-info").innerText = `(Bestellt: ${orderData.quantity_total || orderData.quantity} Stk. | Offen: ${currentMaxQty} Stk.)`
  
  const qtyInput = document.getElementById("inbound-receive-qty-actual")
  const qtyLabel = document.getElementById("inbound-receive-qty-label")
  
  if (qtyInput) {
    qtyInput.value = currentMaxQty
    qtyInput.max = currentMaxQty
  }
  if (qtyLabel) qtyLabel.innerText = `Menge (Max: ${currentMaxQty}) *`

  // Backorder-Zone initial verstecken
  document.getElementById("inbound-receive-backorder-zone").style.display = "none"

  // PUNKT 1B REALISIEREN: Boxen-Vorschläge dynamisch für DIESE Produkt-ID nachladen
  if (orderData.product_id) {
    loadBoxSuggestions(orderData.product_id);
  }

  // 4. Fokus auf den ersten Scan-Bereich setzen & nach oben scrollen
  const locationInput = document.getElementById("inbound-receive-location")
  if (locationInput) locationInput.focus()
  
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (typeof window.translatePage === "function") window.translatePage()
}

// Event-Binding sobald die Plattform bereit ist
window.addEventListener("appandor_platform_ready", () => {
  // PUNKT 1A REALISIEREN: Regalplätze sofort beim Laden der Seite initialisieren
  loadLocationSuggestions()

  const receiveForm = document.getElementById("inbound-receive-form")
  const cancelBtn = document.getElementById("inbound-receive-cancel-btn")
  const qtyInput = document.getElementById("inbound-receive-qty-actual")

  // Abbrechen-Button stellt den Normalzustand her
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => resetInboundControlCard())
  }

  // Überwachung der Mengeneingabe für die Teilmengen-Logik
  if (qtyInput) {
    qtyInput.addEventListener("input", (e) => handleQtyInput(e.target.value))
  }

  // FORMULAR B: WARE EINBUCHEN SUBMIT AN DIE API
  if (receiveForm) {
    receiveForm.addEventListener("submit", (e) => {
      e.preventDefault()
      const token = localStorage.getItem('appandor_jwt_token')
      const errorEl = document.getElementById("inbound-error-message")
      
      const inboundId = document.getElementById("inbound-receive-id").value
      const locationCode = document.getElementById("inbound-receive-location").value
      const boxId = document.getElementById("inbound-receive-box-id").value
      const expiryDate = document.getElementById("inbound-receive-expiry-date").value
      const actualQty = parseInt(document.getElementById("inbound-receive-qty-actual").value) || 0
      const keepBackorder = document.getElementById("inbound-receive-keep-backorder").checked

      // Validierung: Pflichtfelder für das Lager prüfen
      if (!inboundId || !locationCode || actualQty <= 0 || actualQty > currentMaxQty) {
        if (errorEl) {
          errorEl.setAttribute("data-i18n", "msg_error_invalid_receive_data")
          errorEl.style.display = "block"
          if (typeof window.translatePage === "function") window.translatePage()
          setTimeout(() => { errorEl.style.display = "none" }, 4000)
        }
        return
      }

      const payload = {
        inbound_id: inboundId,
        location_code: locationCode,
        box_id: boxId || null,
        expiry_date: expiryDate || null,
        quantity_received: actualQty,
        keep_backorder: actualQty < currentMaxQty ? keepBackorder : false
      }


      // Sende das Paket zur unbestechlichen logistischen Backend-Prüfung
      fetch('/api/inbound/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          tracked_id: parseInt(inboundId), 
          qty_received: actualQty,
          expiry_date: expiryDate || null,
          location_code: locationCode,
          box_id: boxId || null
        })
      })
      .then(res => {
        if (!res.ok) {
          // FIX: Das return MUSS direkt vor res.json() stehen, damit throw new Error aktiv zündet!
          return res.json().then(errData => { 
            throw new Error(errData.error || "ERR_DEFAULT"); 
          });
        }
        return res.json();
      })
      .then(() => {
        resetInboundControlCard()
        if (typeof loadInboundData === "function") {
          loadInboundData() 
        } else {
          window.location.reload()
        }
      })
      .catch(err => {
        const errorEl = document.getElementById("inbound-error-message");
        if (errorEl) {
          // Entfernt das alte data-i18n, damit die Engine den Text nicht wieder zerstört
          errorEl.removeAttribute("data-i18n");

          // Holt die Übersetzung aus dem System
          const translations = window.appandorTranslations || window.translations || {};
          let msg = translations[err.message] || err.message || "Receipt processing failed.";
          
          console.log("=== APPANDOR CATCH LOG ===", msg);
          errorEl.innerText = msg;
          errorEl.style.display = "block";
          
          window.scrollTo({ top: 0, behavior: 'smooth' });
          
          setTimeout(() => { errorEl.style.display = "none"; }, 5000);
        }
        console.error("[Receive Error]:", err.message);
      });
    })
  }
})

// Bindung an den globalen Tabellen-Klick-Event (wird vom Tabellen-Renderer ausgelöst)
window.addEventListener("appandor_trigger_inline_receive", (e) => {
  if (e.detail && e.detail.order) {
    openInlineReceiveForm(e.detail.order)
  }
})
