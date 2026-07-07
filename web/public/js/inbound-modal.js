// ==========================================================================
// APPANDOR INBOUND: EXTENDED MODAL RECEIPT WORKER (2026 LOGISTICS ENGINE)
// ==========================================================================


// =============================================================================
// APPANDOR INBOUND: EXTENDED MODAL RECEIPT WORKER (2026 LOGISTICS ENGINE)
// =============================================================================

window.openReceiveModal = function(trackedId, maxQty, productId) {
    const currentLang = localStorage.getItem('appandor_lang') || 'en';    
    const token = localStorage.getItem('appandor_jwt_token');

    // Wir holen uns die Übersetzungen, Locations und passenden Boxen parallel vom Server
    Promise.all([
        fetch(`lang/${currentLang}.json`).then(res => res.json()),
        fetch('/api/inbound/locations-list', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
        fetch(`/api/inbound/boxes-list/${productId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
    ])
    .then(([translations, locations, boxes]) => {
        const btnConfirm = translations.btn_inbound_confirm || 'Confirm';
        const btnCancel = translations.btn_modal_cancel || 'Cancel';
        
        const lblLocation = translations.lbl_modal_location || 'Scan Shelf Slot';
        const lblBox = translations.lbl_modal_box || 'Scan Box (Optional)';
        const lblExpiry = translations.lbl_modal_expiry || 'Expiry Date (MHD)';

        // UNBESTECHLICHE DYNAMIK: Wir suchen den Produktnamen direkt aus der geklickten Zeile im DOM
        // Das spart uns eine zusätzliche API-Abfrage an den Server!
        const rowElement = document.querySelector(`button[onclick*="openReceiveModal(${trackedId},"]`)?.closest('tr');
        // Wir greifen uns den Text aus der Produktspalte (Kaufmännisch meistens Spalte 2 oder 3)
        //const productName = rowElement ? rowElement.querySelector('.product-name-cell')?.textContent || 'Produkt einbuchen' : 'Produkt einbuchen';const productName = rowElement ? rowElement.cells[1].textContent.trim() : 'Produkt einbuchen';
        const productName = rowElement ? rowElement.cells[1].textContent.trim() : 'Produkt einbuchen';

        // 1. SCHLEIFE: HTML für Regalplatz-Dropdown
        let locationOptionsHTML = '';
        if (Array.isArray(locations)) {
            locations.forEach(loc => {
                const text = `${loc.site} — ${loc.zone} (${loc.slot})`;
                locationOptionsHTML += `<option value="${loc.location_code}" label="${text}"></option>`;
            });
        }

        // 2. SCHLEIFE: HTML für Boxen-Dropdown
        let boxOptionsHTML = '';
        if (Array.isArray(boxes)) {
            boxes.forEach(box => {
                const locText = box.site ? `Stellplatz: ${box.site} — ${box.zone} (${box.slot})` : 'Frei auf Stapel (Leer)';
                boxOptionsHTML += `<option value="${box.box_id}" label="${locText}"></option>`;
            });
        }

        const modalOverlay = document.createElement("div");
        modalOverlay.id = "inbound-receive-modal";
        modalOverlay.className = "appandor-modal-overlay"; 

        // KORREKTUR: Überschrift nutzt jetzt ${productName} und der doppelte Mengen-Block wurde entfernt!
        modalOverlay.innerHTML = `
            <div class="appandor-modal-box" style="max-width: 380px; text-align: left;">
                <h3 class="appandor-modal-title" style="margin-bottom: 20px; font-weight: bold; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; color: var(--text-color); font-size: 16px;">
                    ${productName}
                </h3>
                
                <div id="modal-error-zone" style="display: none; margin-bottom: 15px; padding: 10px; background: rgba(229, 115, 115, 0.15); border: 1px solid #e57373; color: #e57373; border-radius: 4px; font-size: 13px; font-weight: bold; text-align: left; line-height: 1.4;"></div>

                <!-- 1. EINGABE: REGALPLATZ-SCAN -->
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 5px; color: var(--text-muted); font-size: 12px; font-weight: bold;">${lblLocation} *</label>
                    <input type="text" id="modal-location-code" list="location-suggestions" placeholder="z.B. LOC-OB-REGAL-A1" class="appandor-modal-input" style="text-align: left; font-size: 14px; font-weight: normal; padding: 8px;">
                    <datalist id="location-suggestions">
                        ${locationOptionsHTML}
                    </datalist>
                </div>

                <!-- 2. EINGABE: PHYSISCHE BOX-SCAN -->
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 5px; color: var(--text-muted); font-size: 12px; font-weight: bold;">${lblBox}</label>
                    <input type="text" id="modal-box-id" list="box-suggestions" placeholder="z.B. APP-BOX-001" class="appandor-modal-input" style="text-align: left; font-size: 14px; font-weight: normal; padding: 8px;">
                    <datalist id="box-suggestions">
                        ${boxOptionsHTML}
                    </datalist>
                </div>

                <!-- 3. EINGABE: MINDESTHALTBARKEITSDATUM (MHD) -->
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: var(--text-muted); font-size: 12px; font-weight: bold;">${lblExpiry}</label>
                    <input type="date" id="modal-expiry-date" class="appandor-modal-input" style="text-align: left; font-size: 14px; font-weight: normal; padding: 8px;">
                </div>

                <!-- 4. EINGABE: MENGEN-ANPASSUNG (Jetzt sauber und nur noch EINMAL vorhanden) -->
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 5px; color: var(--text-muted); font-size: 12px; font-weight: bold;">Menge (Max: ${maxQty}) *</label>
                    <input type="number" id="modal-receive-qty" min="1" max="${maxQty}" value="${maxQty}" class="appandor-modal-input" style="font-size: 16px;" oninput="toggleBackorderCheckbox(this.value, ${maxQty})">
                </div>

                <!-- 4B. DYNAMISCHE ABFRAGE: Nur sichtbar bei Teilmengen -->
                <div id="backorder-zone" class="form-group" style="display: none; margin-bottom: 25px; background: var(--input-bg); padding: 10px; border: 1px solid var(--border-color); border-radius: 4px;">
                    <label style="display: flex; align-items: center; gap: 8px; color: var(--text-color); font-size: 13px; cursor: pointer;">
                        <input type="checkbox" id="modal-keep-backorder" checked style="width: 16px; height: 16px; cursor: pointer;">
                        <span id="backorder-text">Restliche Menge als offen behalten (Nachlieferung)</span>
                    </label>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button id="modal-receive-cancel" style="padding: 10px 16px; background: var(--input-bg); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px;">
                        ${btnCancel}
                    </button>
                    <button id="modal-receive-confirm" style="padding: 10px 20px; background: #2e7d32; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px;">
                        ${btnConfirm}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        // Klick auf den Einbuchen-Button (Rechts)
        document.getElementById("modal-receive-confirm").addEventListener("click", () => {
            const inputQty = parseInt(document.getElementById("modal-receive-qty").value);
            const locCode = document.getElementById("modal-location-code").value.trim();
            const boxId = document.getElementById("modal-box-id").value.trim();
            const expiryDate = document.getElementById("modal-expiry-date").value;
            const errZone = document.getElementById("modal-error-zone");

            // Frontend-Vorvalidierung: Platz muss gescannt sein
            if (!locCode) {
                if (errZone) {
                    errZone.innerText = currentLang === 'de' ? 'Bitte scannen oder wählen Sie einen gültigen Regalplatz.' : 'Please scan or select a valid shelf slot.';
                    errZone.style.display = "block";
                }
                return;
            }

            if (isNaN(inputQty) || inputQty <= 0 || inputQty > maxQty) {
                if (errZone) {
                    errZone.innerText = currentLang === 'de' ? 'Ungültige Einbuchungs-Menge angegeben.' : 'Invalid quantity specified.';
                    errZone.style.display = "block";
                }
                return;
            }

            // Sende das Paket zur unbestechlichen logistischen Backend-Prüfung
            sendReceiveRequest(trackedId, inputQty, expiryDate, locCode, boxId, modalOverlay, translations);
        });

        // Klick auf den Abbrechen-Button (Links)
        document.getElementById("modal-receive-cancel").addEventListener("click", () => modalOverlay.remove());
    })
    .catch(err => console.error("[Modal Lang Error]:", err.message));
};

// Sendet die verifizierten Logistik-Parameter an die Express-API
function sendReceiveRequest(trackedId, receiveQty, expiryDate, locCode, boxId, modalOverlay, translations) {
    const token = localStorage.getItem('appandor_jwt_token');
    const errZone = document.getElementById("modal-error-zone");

    fetch('/api/inbound/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
            tracked_id: trackedId, 
            qty_received: receiveQty,
            expiry_date: expiryDate || null,
            location_code: locCode,
            box_id: boxId || null
        })
    })
    .then(res => {
        if (!res.ok) {
            // Wenn der Server mit einem Fehler ablehnt (z.B. Volumen voll), fangen wir den Error-Code ab
            return res.json().then(errData => { throw new Error(errData.error || "ERR_DEFAULT"); });
        }
        return res.json();
    })
    .then(() => {
        if (modalOverlay) modalOverlay.remove();
        window.location.reload(); // Aktualisiert die Tabelle und spiegelt den Split wider!
    })
    .catch(err => {
        if (errZone) {
            // Nutzt den sprachsicheren JSON-Schlüssel des Servers oder fällt auf den Standard-Fehlermeldungs-Text zurück
            let msg = translations[err.message] || err.message || "Receipt processing failed.";
            errZone.innerText = msg;
            errZone.style.display = "block";
        }
    });
}
