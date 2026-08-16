const zlib = require('zlib');

module.exports = function(req, res, next) {
  let url = req.originalUrl.toLowerCase();
  
  try {
    url = decodeURIComponent(decodeURIComponent(url)); 
  } catch (e) {}

  const isWhitelisted = req.ip === '127.0.0.1' || req.ip === '::1';
  if (isWhitelisted) return next();

  // ---------------------------------------------------------------------------
  // FALL A: PHP-ANGRIFFE -> DIE DYNAMISCHE GZIP-TEXT-BOMBE
  // ---------------------------------------------------------------------------
  if (url.includes('.php')) {
    console.warn(`[HTTP] ${global.getLogIp(req)}${req.method} ${req.originalUrl} -> ENTRAPPED IN GZIP TEXT BOMB`); 

    res.removeHeader('X-Powered-By');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8', 
      'Content-Encoding': 'gzip',
      'Connection': 'keep-alive',
      'Transfer-Encoding': 'chunked'
    });

    const gzipStream = zlib.createGzip({ level: 9 }); 
    gzipStream.pipe(res);
    gzipStream.write('<!DOCTYPE html><html><body><h1>API Gateway Active</h1>\n');

    let counter = 0;
    let bombTimeoutId = null;

    function triggerNextTick() {
      if (res.writableEnded || req.destroyed) {
        clearTimeout(bombTimeoutId);
        gzipStream.end();
        return;
      }

      counter++;
      
      let textLine = `[Log-Segment-${counter}] Status: Active. Node verified. Session synchronized.\n`;
      let textChunk = textLine.repeat(500); 
      gzipStream.write(textChunk);

      let currentDelay = 1000; 
      if (counter > 60)  currentDelay = 5000; 
      if (counter > 120) currentDelay = 10000; 

      bombTimeoutId = setTimeout(triggerNextTick, currentDelay);
    }

    triggerNextTick();

    setTimeout(() => {
      clearTimeout(bombTimeoutId);
      gzipStream.end();
    }, 300000);

    return; 
  }

  // ---------------------------------------------------------------------------
  // FALL B: ANDERE BOT-SCANS -> IN DIE UNENDLICHE JSON-FLUT WERFEN
  // ---------------------------------------------------------------------------
  
  // 1. Alle Bot-Scan-Muster sauber in einer Liste (Array) sammeln
  const botPatterns = [
    '..', '/lang/', '/migadmin/', '/geoserver/', '/remote/', '/cgi-bin/', '/bin/',
    'allow_url_include', 'auto_prepend_file', 'php://', '-d ', '\xadd',
    '/wsman', 'reportserver', '/backup/', '/uploads/', '/data/', '/tmp/', '/static/', '/assets/',
    '.git', '.svn', '.env', '/rpc', '/v1', '/jsonrpc', '/evm', '/solana', '.npmrc'
  ];

  // 2. Prüfen, ob die URL MINDESTENS eines der Muster aus der Liste enthält
  const isBotScan = botPatterns.some(pattern => url.includes(pattern));

  // 3. Wenn ein Muster matcht ODER ein POST auf die Startseite erfolgt -> Ab in die JSON-Flut
  if (isBotScan || (req.method === 'POST' && (url === '/' || url === ''))) {
    console.warn(`[HTTP] ${global.getLogIp(req)}${req.method} ${req.originalUrl} -> ENTRAPPED IN INFINITE JSON FLOOD`); 

    res.removeHeader('X-Powered-By');
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
      const fakeData = {
        index: counter,
        timestamp: new Date().toISOString(),
        payload: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
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

  next();
};
