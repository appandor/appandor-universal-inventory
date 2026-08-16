// =============================================================================
// APPANDOR LOGISTICS: CENTRAL ENGINE
// =============================================================================

global.appandor_server_branding = 'Microsoft-IIS/10.0'; // Für den Verkauf später änderbar in 'Appandor-Inventory'
global.appandor_log_real_ips = true; // true = IPs mitloggen | false = komplett weglassen
global.getLogIp = function(req) { return global.appandor_log_real_ips ? `[IP: ${req.ip}] ` : ''; };

global.appandor_latency_pool = [];

require('./server_core/logger');

console.log('[SYSTEM] =====================================================');
console.log('[SYSTEM] ENGINE START'); 
console.log('[SYSTEM] =====================================================');

const fs = require('fs');
const path = require('path');
const firewall = require('./server_core/firewall');
const express = require('express');
const https = require('https');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = 443;

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("[CRITICAL] ENGINE ABORT: JWT_SECRET is not defined in environment variables!");
  process.exit(1);
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10),
});

app.set('db_pool', pool);

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/inventory.appandor.de/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/inventory.appandor.de/fullchain.pem')
};

app.use(express.json());
const publicPath = path.join(__dirname, 'web', 'public');
app.use(express.static(publicPath));

// =============================================================================
// STUFE 1: SELEKTIVE SUCHMASCHINEN-SPERRE
// =============================================================================
app.use((req, res, next) => {

  res.removeHeader('X-Powered-By');
  res.setHeader('Server', global.appandor_server_branding);

  const p = req.path.toLowerCase();
  if (p === '/' || p === '/robots.txt') {
    res.setHeader('X-Robots-Tag', 'index, follow');
  } else {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
});
// =============================================================================
// STUFE 2: FIREWALL & COUNTERMEASURES (HIEHER VERSCHIEBEN!)
// =============================================================================
app.use(firewall); 

// =============================================================================
// STUFE 3: PERFORMANCE-LOGGER (Loggt INFO über console.log)
// =============================================================================
app.use((req, res, next) => {
  const startTime = process.hrtime();

  res.on('finish', () => {

    if (req.originalUrl.toLowerCase().includes('/api/admin/')) {      
      return; // Bricht das Logging ab, der Request läuft im Hintergrund trotzdem sauber durch
    }
    
    const diff = process.hrtime(startTime);
    const durationMs = Math.round((diff[0] * 1e3 + diff[1] / 1e6));

    global.appandor_latency_pool.push(durationMs);

    if (global.appandor_latency_pool.length > 100) {
      global.appandor_latency_pool.shift();
    }
    console.log(`[HTTP] ${global.getLogIp(req)}${req.method} ${req.originalUrl} -> Status: ${res.statusCode} (${durationMs}ms)`);
  });
  next();
});

// =============================================================================
// ENDPUNKTE / BASIS-ROUTEN
// =============================================================================
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nAllow: /$\nDisallow: /');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'lp.html'));
});

app.get('/api/status', (req, res) => {
  res.json({ status: "alive", multi_tenancy: "ready", security: "https_secured" });
});

// =============================================================================
// PLATFORM API ROUTER INTERFACES
// =============================================================================
const authRouter = require('./routes/auth');
const inventoryRouter = require('./routes/inventory');
const productsRouter = require('./routes/products');
const inboundRouter = require('./routes/inbound');
const outboundRouter = require('./routes/outbound');
const adminRouter = require('./routes/admin');
const metricsRouterSystem = require('./routes/metrics_system'); 
const metricsRouterDb = require('./routes/metrics_db'); 

app.use('/api/auth', authRouter); 
app.use('/api/inventory', inventoryRouter);
app.use('/api/products', productsRouter);
app.use('/api/inbound', inboundRouter);
app.use('/api/outbound', outboundRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/metrics', metricsRouterSystem);
app.use('/api/admin/metrics_db', metricsRouterDb);

app.get('/api/verify-session', (req, res) => {
  res.redirect(307, '/api/auth/verify-session');
});

// =============================================================================
// GLOBAL DEFENSIVE 404 CATCH-ALL HANDLER
// =============================================================================
app.use((req, res) => {
  // Option A: Schickt einfach ein sauberes, kurzes "Not Found" als Text
  //res.status(404).send('Not Found');

  // Option B (Empfohlen für reine APIs): Schickt ein strukturiertes JSON zurück
  res.status(404).json({ error: "Not Found", path: req.originalUrl });
});

// =============================================================================
// SERVER ENGINE STARTUP
// =============================================================================
fs.writeFile(path.join(__dirname, 'last_start_time'), 'System started', () => {});

https.createServer(options, app).listen(PORT, () => {
  console.log('[SYSTEM] =====================================================');
  console.log(`[SYSTEM] ENGINE INIZALIZED: Appandor Core running live on port ${PORT}`);
  console.log('[SYSTEM] =====================================================');
});
