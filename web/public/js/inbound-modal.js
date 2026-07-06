// ==========================================================================
// APPANDOR INBOUND: MODAL RECEIPT WORKER (ISOLATED SPECIFIC COMPONENT)
// ==========================================================================

// Öffnet das modale Fenster für die optionale Mengenanpassung
window.openReceiveModal = function(trackedId, maxQty) {
    const currentLang = localStorage.getItem('appandor_lang') || 'en';    

    // Holt sich die Übersetzungen synchron aus dem Speicher oder lädt sie kurz nach
    fetch(`lang/${currentLang}.json`)
        .then(res => res.json())
        .then(translations => {
            const modalTitle = translations.modal_receive_title || 'Confirm Quantity';
            const btnConfirm = translations.btn_modal_confirm || 'Confirm';
            const btnCancel = translations.btn_modal_cancel || 'Cancel';

            const modalOverlay = document.createElement("div");
            modalOverlay.id = "inbound-receive-modal";
            modalOverlay.className = "appandor-modal-overlay"; 
            modalOverlay.innerHTML = `
                <div style="background: var(--card-bg, #ffffff); border: 1px solid var(--border-color, #e0e0e0); padding: 25px; border-radius: 6px; width: 100%; max-width: 320px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); font-family: sans-serif;">
                    <h3 style="color: var(--text-color, #1a1a1a); margin: 0 0 15px 0; font-size: 16px;">${modalTitle}</h3>
                    <div id="modal-error-zone" style="display: none; margin-bottom: 15px; padding: 10px; background: rgba(229, 115, 115, 0.15); border: 1px solid #e57373; color: #e57373; border-radius: 4px; font-size: 13px; font-weight: bold; text-align: left;"></div>
                    <div style="margin-bottom: 20px;">
                        <input type="number" id="modal-receive-qty" min="1" max="${maxQty}" value="${maxQty}" style="width: 100%; padding: 8px; background: var(--input-bg, #f5f5f5); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 4px; text-align: center; font-weight: bold; font-size: 16px; box-sizing: border-box;">
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button id="modal-receive-cancel" style="padding: 6px 12px; background: transparent; border: 1px solid var(--border-color); color: var(--text-muted); border-radius: 4px; cursor: pointer; font-size: 13px;">${btnCancel}</button>
                        <button id="modal-receive-confirm" style="padding: 6px 16px; background: #2e7d32; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px;">${btnConfirm}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modalOverlay);

            document.getElementById("modal-receive-confirm").addEventListener("click", () => {
                const inputQty = parseInt(document.getElementById("modal-receive-qty").value);
                if (isNaN(inputQty) || inputQty <= 0 || inputQty > maxQty) {
                    const errZone = document.getElementById("modal-error-zone");
                    if (errZone) {
                        errZone.innerText = "Ungültige Menge";
                        errZone.style.display = "block";
                    }
                    return;
                }
                
                sendReceiveRequest(trackedId, inputQty, modalOverlay);
            });

            document.getElementById("modal-receive-cancel").addEventListener("click", () => {
                modalOverlay.remove();
            });
        })
        .catch(err => console.error("[Modal Lang Error]:", err.message));
};

// Sendet die verifizierte Menge an das Backend
function sendReceiveRequest(trackedId, receiveQty, modalOverlay) {
    const token = localStorage.getItem('appandor_jwt_token');
    const currentLang = localStorage.getItem('appandor_lang') || 'en';
    const errZone = document.getElementById("modal-error-zone");

    fetch('/api/inbound/receive', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            tracked_id: trackedId,
            qty_received: receiveQty
        })
    })
    .then(res => {
        // Wenn der Server nicht mit 200 OK antwortet, lesen wir den echten Grund aus
        if (!res.ok) {
            // Bei 404 Route nicht gefunden (z.B. weil die Route im Backend noch fehlt)
            if (res.status === 404) {
                throw new Error("ERR_ROUTE_NOT_FOUND");
            }
            // Versuche, die JSON-Fehlermeldung vom Backend zu parsen
            return res.json().then(errData => {
                throw new Error(errData.error || "ERR_DEFAULT");
            }).catch(() => {
                throw new Error("ERR_SERVER_CRASH");
            });
        }
        return res.json();
    })
    .then(() => {
        if (modalOverlay) modalOverlay.remove();
        window.location.reload();
    })
    .catch(err => {
        if (errZone) {
            // Laden der JSON-Sprachdatei für eine saubere, übersetzte Fehlermeldung
            fetch(`lang/${currentLang}.json`)
                .then(res => res.json())
                .then(translations => {
                    let userFriendlyMsg = translations.msg_error_receipt_failed || "Receipt processing failed.";

                    // Exakte Ursachenforschung anhand des Fehlercodes
                    if (err.message === "ERR_ROUTE_NOT_FOUND") {
                        userFriendlyMsg = translations.msg_err_api_missing || "Interface missing: The backend route has not been deployed on the server yet (404).";
                    } else if (err.message === "ERR_SERVER_CRASH") {
                        userFriendlyMsg = translations.msg_err_server_crash || "Database error: The transaction was rejected by the server (500).";
                    } else if (err.message !== "ERR_DEFAULT" && err.message !== "Receipt processing failed") {
                        // Wenn das Backend einen spezifischen Text geschickt hat
                        userFriendlyMsg = err.message;
                    }

                    errZone.innerText = userFriendlyMsg;
                    errZone.style.display = "block";
                })
                .catch(() => {
                    errZone.innerText = err.message;
                    errZone.style.display = "block";
                });
        }
    });
}
