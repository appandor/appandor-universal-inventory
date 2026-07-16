// =============================================================================
// APPANDOR LOGISTICS: SYSTEM ADMINISTRATION MAIN MODULE (ULTRA-CLEAN / CRLF)
// =============================================================================

window.addEventListener("appandor_platform_ready", () => {
  const allTabs = document.querySelectorAll(".settings-tab-item");

  // EVENT-LISTENER FÜR ALLE REITER-KLICKS
  allTabs.forEach(tab => {
    tab.addEventListener("click", async (e) => {
      allTabs.forEach(t => t.classList.remove("active"));
      e.target.classList.add("active");

      const contentArea = document.getElementById("admin-tab-content-area");
      if (contentArea) {
        contentArea.innerHTML = `<p class="gen_text-loading" data-i18n="gen_text_loading"></p>`;
        if (typeof window.translatePage === "function") window.translatePage();
      }

      // RADIKALER 1-ZEILER: Importiert und startet das Modul direkt über die ID
      try {
        const module = await import(`./${e.target.id}.js`);
        if (typeof module.initModule === "function") module.initModule();
      } catch (err) {
        console.error(`[Module Error] ${e.target.id}.js:`, err.message);
      }
    });
  });

  // INITIAL-START BEIM SEITENAUFRUF
  const activeTab = document.querySelector(".settings-tab-item.active");
  if (activeTab) {
    import(`./${activeTab.id}.js`)
      .then(module => { if (typeof module.initModule === "function") module.initModule(); })
      .catch(err => console.error(`[Initial Load Error] ${activeTab.id}.js:`, err.message));
  }

  // GLOBALER RESTART-TRIGGER
  const restartBtn = document.getElementById("admin-btn-restart");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      if (!confirm("WARNUNG: Gesamtes Logistik-Triebwerk jetzt neu starten?")) return;
      const token = localStorage.getItem('appandor_jwt_token');
      
      fetch('/api/admin/restart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => { if (!res.ok) throw new Error("Restart trigger rejected"); return res.json(); })
      .then(data => alert(data.message))
      .catch(err => console.error("[Restart Pipeline Error]:", err.message));
    });
  }
});
