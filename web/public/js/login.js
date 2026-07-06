document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const errorContainer = document.getElementById("error-container");

    console.log("[TCG-DEBUG]: Formular geladen. E-Mail-Feld gefunden?", !!emailInput);

    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault(); 

            if (errorContainer) errorContainer.style.display = "none";

            const payload = {
                email: emailInput.value,
                password: passwordInput.value
            };

            console.log("[TCG-DEBUG]: Sende Daten an die API:", payload);

            fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => {
                console.log("[TCG-DEBUG]: Antwort vom Server erhalten. HTTP-Status:", res.status);
                
                if (res.status === 401) throw new Error("Invalid credentials");
                if (!res.ok) throw new Error("Server communication error");
                return res.json();
            })
            .then(data => {
                localStorage.setItem('appandor_jwt_token', data.token);
                window.location.href = "dashboard.html";
            })
            .catch(err => {
                console.error("[TCG-ERROR]: Fehler im Login-Prozess:", err.message);
                if (errorContainer) {
                    const currentLang = localStorage.getItem('appandor_lang') || 'en';
                    
                    // KORREKTUR: Fehlertexte dynamisch und sauber aus den Sprachdateien ziehen!
                    fetch(`lang/${currentLang}.json`)
                        .then(res => res.json())
                        .then(translations => {
                            if (err.message === "Invalid credentials") {
                                errorContainer.innerText = translations["err_invalid_credentials"] || "Invalid credentials.";
                            } else {
                                errorContainer.innerText = translations["err_server_unreachable"] || "Server error.";
                            }
                            errorContainer.style.display = "block";
                        })
                        .catch(() => {
                            errorContainer.innerText = "Authentication Error.";
                            errorContainer.style.display = "block";
                        });
                }
            });
        });
    }
});

// Öffnet das modale Fenster für die Passwort-Vergessen-Anforderung
window.openForgotPasswordModal = function(e) {
    e.preventDefault(); // Stoppt das standardmäßige Springen des Browsers bei "#"-Links
    
    const currentLang = localStorage.getItem('appandor_lang') || 'en';    

    fetch(`lang/${currentLang}.json`)
        .then(res => res.json())
        .then(translations => {
            const modalTitle = translations.modal_forgot_password_title || 'Reset Password';
            const emailLabel = translations.login_label_email_reset || 'Enter your email address';
            const btnSend = translations.btn_modal_send || 'Request Link';
            const btnCancel = translations.btn_modal_cancel || 'Cancel';

            const modalOverlay = document.createElement("div");
            modalOverlay.id = "forgot-password-modal";
            modalOverlay.className = "appandor-modal-overlay"; // Aktiviert das globale ESC-System!

            modalOverlay.innerHTML = `
                <div class="appandor-modal-box" style="max-width: 360px; text-align: left;">
                    <h3 class="appandor-modal-title" style="margin-bottom: 20px; font-weight: bold; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">${modalTitle}</h3>
                    
                    <div id="modal-forgot-error-zone" style="display: none; margin-bottom: 15px; padding: 10px; background: rgba(229, 115, 115, 0.15); border: 1px solid #e57373; color: #e57373; border-radius: 4px; font-size: 13px; font-weight: bold;"></div>

                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 13px;">${emailLabel} *</label>
                        <input type="email" id="forgot-email-input" placeholder="z.B. hugo@appandor.de" class="appandor-modal-input" style="text-align: left; font-size: 14px; font-weight: normal;">
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 5px;">
                        <!-- Aktion Abbrechen links -->
                        <button id="modal-forgot-cancel" style="padding: 10px 16px; background: var(--input-bg); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px;">
                            ${btnCancel}
                        </button>
                        <!-- Aktion Durchführen rechts -->
                        <button id="modal-forgot-submit" style="padding: 10px 20px; background: #2e7d32; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px;">
                            ${btnSend}
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modalOverlay);

            // Klick auf Absenden (Platzhalter für den späteren API-Request)
            document.getElementById("modal-forgot-submit").addEventListener("click", () => {
                const emailInput = document.getElementById("forgot-email-input");
                if (!emailInput || !emailInput.value.trim()) {
                    const errZone = document.getElementById("modal-forgot-error-zone");
                    if (errZone) {
                        errZone.innerText = currentLang === 'es' ? 'Por favor, introduzca un correo válido.' : currentLang === 'de' ? 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' : 'Please enter a valid email address.';
                        errZone.style.display = "block";
                    }
                    return;
                }
                
                // HIER SPÄTER DER BACKEND FETCH - VORERST NUR ABSCHALTUNG
                console.log("[Forgot Password Request]: Link triggered for " + emailInput.value);
                modalOverlay.remove();
            });

            // Klick auf Abbrechen
            document.getElementById("modal-forgot-cancel").addEventListener("click", () => {
                modalOverlay.remove();
            });
        })
        .catch(err => console.error("[Forgot Password Modal Error]:", err.message));
};

