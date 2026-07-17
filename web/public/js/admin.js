// =============================================================================
// APPANDOR LOGISTICS: SYSTEM ADMINISTRATION MAIN MODULE (CRLF)
// =============================================================================

window.addEventListener("appandor_platform_ready", () => {
  const mainContainer = document.getElementById("container");

  const tabTables = document.getElementById("admin-tab-tables");
  const tabDbAdmin = document.getElementById("admin-tab-dbadmin");
  const tabLogs = document.getElementById("admin-tab-logs");
  const tabMetrics = document.getElementById("admin-tab-metrics");

  // =============================================================================
  // ZENTRALE ROUTING-MASCHINE: Steuert die Ansicht basierend auf dem URL-Hash
  // =============================================================================
  function renderActiveTabByHash() {
    // Holt den aktuellen Hash-Wert (z.B. "#metrics") und entfernt das #-Zeichen
    const currentHash = window.location.hash.substring(1);

    // Initialen Zustand von allen Reiter-Spans säubern
    if (tabTables) tabTables.classList.remove("active");
    if (tabDbAdmin) tabDbAdmin.classList.remove("active");
    if (tabLogs) tabLogs.classList.remove("active");
    if (tabMetrics) tabMetrics.classList.remove("active");

    // Weist den Inhalt basierend auf dem Hash dem Container zu
    if (currentHash === "dbadmin" && tabDbAdmin) {
      tabDbAdmin.classList.add("active");
      if (typeof window.initAdminDbAdmin === "function") window.initAdminDbAdmin();
    } else if (currentHash === "logs" && tabLogs) {
      tabLogs.classList.add("active");
      if (typeof window.initAdminLogs === "function") window.initAdminLogs();
    } else if (currentHash === "metrics" && tabMetrics) {
      tabMetrics.classList.add("active");
      if (typeof window.initAdminMetrics === "function") window.initAdminMetrics();
    } else {
      // FALLBACK: Wenn kein oder ein unbekannter Hash gesetzt ist, ab auf die Tabellen
      if (tabTables) {
        tabTables.classList.add("active");
        // Erzwingt den Hash in der Adresszeile, damit die URL synchron bleibt
        window.location.hash = "tables"; 
        if (typeof window.initAdminTables === "function") window.initAdminTables();
      }
    }
  }

  // Horchposten für den Browser-Verlauf (Zurück-/Vorwärts-Buttons des Benutzers)
  window.addEventListener("hashchange", renderActiveTabByHash);

  // ERSTSTART: Zündet die Weiche sofort beim allerersten Laden der Seite
  renderActiveTabByHash();

  // =============================================================================
  // GLOBALER RESTART-TRIGGER
  // =============================================================================
  const restartBtn = document.getElementById("admin-btn-restart");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      const token = localStorage.getItem('appandor_jwt_token');
      
      if (!confirm("Möchtest du das System jetzt wirklich neu starten?")) return;

      fetch('/api/admin/system/execute', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ action: "restart_node" })
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          alert("Neustart erfolgreich eingeleitet!");
          setTimeout(() => location.reload(), 3000);
        } else {
          alert("Fehler beim Neustart: " + (resData.error || "Unbekannter Fehler"));
        }
      })
      .catch(err => console.error("[UI Admin Restart Error]:", err.message));
    });
  }

  // =============================================================================
  // REITER-KLICK-HANDLER: Ändern ab jetzt NUR noch den Hash. Den Rest macht die Weiche!
  // =============================================================================
  if (tabTables) {
    tabTables.addEventListener("click", () => {
      window.location.hash = "tables";
    });
  }

  if (tabDbAdmin) {
    tabDbAdmin.addEventListener("click", () => {
      window.location.hash = "dbadmin";
    });
  }

  if (tabLogs) {
    tabLogs.addEventListener("click", () => {
      window.location.hash = "logs";
    }); 
  }

  if (tabMetrics) {
    tabMetrics.addEventListener("click", () => {
      window.location.hash = "metrics";
    });
  }

  window.dispatchEvent(new Event("appandor_render_complete"));
});
