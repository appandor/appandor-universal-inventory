// =============================================================================
// APPANDOR LOGISTICS: ERLAUBTE SEITEN / API'S
// =============================================================================

const fs = require('fs');
const path = require('path');

const legalRoutes = [ '/robots.txt' ];

try {
  // --- SCAN 1: FRONTEND (web/public) ---
  const publicPath = path.join(__dirname, '..', 'web', 'public');
  if (fs.existsSync(publicPath)) {
    const items = fs.readdirSync(publicPath);
    items.forEach(item => {
      if (item.includes('copy') || item.includes('2026')) return;
      
      const fullPath = path.join(publicPath, item);
      const isDirectory = fs.statSync(fullPath).isDirectory();
      
      if (isDirectory) {
        legalRoutes.push(`/${item.toLowerCase()}/`);
      } else {
        legalRoutes.push(`/${item.toLowerCase()}`);
      }
    });
  }

  // --- SCAN 2: BACKEND ROUTER (routes) ---
  const routesPath = path.join(__dirname, '..', 'routes');
  if (fs.existsSync(routesPath)) {
    const routerFiles = fs.readdirSync(routesPath);
    routerFiles.forEach(file => {
      if (!file.endsWith('.js') || file.includes('copy') || file.includes('2026')) return;
      
      const routerName = path.basename(file, '.js').toLowerCase();
      legalRoutes.push(`/api/${routerName}/`);
    });
  }

  console.log(`[System] =====================================================`);
  console.log(`[System] WHITELIST MATRIX INITIALIZED (${legalRoutes.length + 1} ENTRIES)`); // +1 wegen der impliziten Startseite
  console.log(`[System] =====================================================`);
  console.log(`[System] -> ALLOWED: / (Exact Match Only)`);
  legalRoutes.forEach(route => {
    console.log(`[System] -> ALLOWED PREFIX: ${route}`);
  });

} catch (err) {
  console.error("[Whitelist Core] Critical initialization error:", err.message);
}

module.exports = {
  isLegal: function(url) {
    const cleanUrl = url.split('?')[0];

    // SONDERFALL: Die nackte Startseite darf NUR exakt matchen!
    if (cleanUrl === '/') return true;

    return legalRoutes.some(legalPath => {
      // Fall 1: Exakter Match für Dateien (z.B. /login.html oder /robots.txt)
      if (cleanUrl === legalPath) return true;
      
      // Fall 2: Präfix-Prüfung für echte Ordner und APIs (z.B. /css/ oder /api/auth/)
      if (legalPath.endsWith('/')) {
        return cleanUrl.startsWith(legalPath);
      }
      
      return false;
    });
  },
  routes: legalRoutes
};
