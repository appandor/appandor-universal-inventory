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
