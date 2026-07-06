document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const errorContainer = document.getElementById("error-container");

    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault(); // Standard-Seiten-Refresh blockieren

            // Fehlermeldung vorher leeren
            if (errorContainer) errorContainer.style.display = "none";

            const payload = {
                email: emailInput.value,
                password: passwordInput.value
            };

            // Abflug zur scharfen API-Route!
            fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (res.status === 401) throw new Error("Invalid credentials");
                if (!res.ok) throw new Error("Server communication error");
                return res.json();
            })
            .then(data => {
                // Erfolg! Das echte, kryptografisch signierte Ticket im Browser einbetten
                localStorage.setItem('appandor_jwt_token', data.token);
                
                // Wir leiten den Nutzer direkt zum Warenbestand weiter!
                window.location.href = "dashboard.html";
            })
            .catch(err => {
                console.error("[Login Process Error]:", err.message);
                if (errorContainer) {
                    errorContainer.innerText = err.message === "Invalid credentials" 
                        ? "Ungültige E-Mail oder falsches Passwort." 
                        : "Schnittstellen-Fehler. Server nicht erreichbar.";
                    errorContainer.style.display = "block";
                }
            });
        });
    }
});
