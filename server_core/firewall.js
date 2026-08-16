// =============================================================================
// APPANDOR LOGISTICS: ABWEHRMASSNAMEN GEGEN ANGREIFER 
// =============================================================================

const zlib = require('zlib');
const whitelist = require('./whitelist');

module.exports = function(req, res, next) {
  let url = req.originalUrl.toLowerCase();
  
  try {
    url = decodeURIComponent(decodeURIComponent(url)); 
  } catch (e) {}

  const isWhitelisted = req.ip === '127.0.0.1' || req.ip === '::1';
  if (isWhitelisted) return next();

  // ---------------------------------------------------------------------------
  // DIE STRATEGISCHE WHITELIST-PRÜFUNG
  // ---------------------------------------------------------------------------

  if (!whitelist.isLegal(url)) {

    // FALL A: Wenn es ein PHP-Angriff ist -> Gzip-Druckwelle
    if (url.includes('.php')) {
      console.warn(`[HTTP] ${global.getLogIp(req)}${req.method} ${req.originalUrl} -> ENTRAPPED IN GZIP TEXT BOMB`); 

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8', 
        'Content-Encoding': 'gzip',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked'
      });

      const gzipStream = zlib.createGzip({ level: 9 }); 
      gzipStream.pipe(res);

      // 1. Die HTML-Struktur öffnen
      gzipStream.write('<!DOCTYPE html><html><body><pre style="color: #ff3333; font-family: monospace; font-weight: bold; font-size: 11px; line-height: 1.1;">\n');

      // 2. Das nackte Logo deklarieren (Backslashes sauber escaped)
      const rawLogo = `
 __      __.__            __        .___                                                     __ _________ 
/  \\    /  \\  |__ _____ _/  |_    __| _/____    ___.__. ____  __ __  __  _  _______    _____/  |\\_____   \\
\\   \\/\\/   /  |  \\\\__  \\\\   __\\  / __ |/  _ \\  <   |  |/  _ \\|  |  \\ \\ \\/ \\/ /\\__  \\  /    \\   __\\ /   __/
 \\        /|   Y  \\/ __ \\|  |   / /_/ (  <_> )  \\___  (  <_> )  |  /  \\     /  / __ \\|   |  \\  |  |   |   
  \\__/\\  / |___|  (____  /__|   \\____ |\\____/   / ____|\\____/|____/    \\/\\_/  (____  /___|  /__|  |___|   
       \\/       \\/     \\/            \\/         \\/                                 \\/     \\/      <___>
[Security-Alert: Session Blocked By Firewall]\n`;

      // 3. OPTIMIERUNG: Den Riesen-Block 100-mal wiederholen und EINMALIG im RAM ablegen
      const massiveLogoChunk = rawLogo.repeat(100);

      let counter = 0;
      let bombTimeoutId = null;
      let globalSafetyTimeoutId = null;

      function triggerNextTick() {
        if (res.writableEnded || req.destroyed) {
          clearTimeout(bombTimeoutId);
          clearTimeout(globalSafetyTimeoutId);
          gzipStream.end();
          return;
        }

        counter++;
        
        // Senden des vorgefertigten Riesen-Blocks ohne CPU-Mühe
        gzipStream.write(massiveLogoChunk);

        let currentDelay = 1000; 
        if (counter > 60)  currentDelay = 5000; 
        if (counter > 120) currentDelay = 10000; 

        bombTimeoutId = setTimeout(triggerNextTick, currentDelay);
      }

      triggerNextTick();

      globalSafetyTimeoutId = setTimeout(() => {
        clearTimeout(bombTimeoutId);
        gzipStream.end();
      }, 300000);

      return; 

    } else {
      // FALL B: JEDER ANDERE WHITELIST-VERSTOSS (Wie /Dr0v, /en, ads.txt) -> Ab in die JSON-Flut
      console.warn(`[HTTP] ${global.getLogIp(req)}${req.method} ${req.originalUrl} -> ENTRAPPED IN INFINITE JSON FLOOD`); 

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked'
      });

      res.write('[\n');
      let counter = 0;

      const streamInterval = setInterval(() => {
        if (res.writableEnded || req.destroyed) {
          clearInterval(streamInterval);
          return;
        }

        counter++;
        
        const randomHash = Math.random().toString(36).substring(2, 15);
        const fakeData = {
          index: counter,
          timestamp: new Date().toISOString(),
          payload: randomHash + "XYZ" + counter,
          status: "active"
        };

        res.write(JSON.stringify(fakeData) + ',\n');
      }, 1000);

      setTimeout(() => {
        clearInterval(streamInterval);
        if (!res.writableEnded) {
          res.write('{"status":"terminated"}\n]');
          res.end();
        }
      }, 300000); 

      return; 
    }
  }

  // Zusätzlicher Schutz: Fängt unberechtigte POSTs ab, falls jemand auf legalen Pfaden manipuliert
  if (req.method === 'POST' && (url === '/' || url === '')) {
    // Umleitung in Fall B (JSON FLOOD) für illegale Root-POST-Anfragen
    return module.exports({ originalUrl: '/illegal-root-post' }, res, next);
  }

  next();
};
