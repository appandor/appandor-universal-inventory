// =============================================================================
// APPANDOR LOGISTICS: CENTRAL ENGINE
// =============================================================================

global.appandor_server_branding = process.env.SERVER_BRANDING || '[YOUR BRANDING]';
global.appandor_log_real_ips = true; // true = IPs mitloggen | false = komplett weglassen

global.getLogIp = function(req) {
  // Wenn der globale Schalter auf false steht, wird die IP sofort komplett weggelassen
  if (!global.appandor_log_real_ips) return '';

  const usedHost = req.headers.host ? `[Host: ${req.headers.host}] ` : '';
  const forwarded = req.headers['x-forwarded-for'];

  // Nimmt die erste IP aus dem Proxy-Header ODER den harten Linux-Socket
  const rawIp = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
  
  // Liefert das exakte Format für deinen Frontend-Filter und verhindert das "undefined"
  return `[IP: ${rawIp || '0.0.0.0'}] ${usedHost} `;
};
global.appandor_latency_pool = [];

require('./server_core/logger');

console.log('[SYSTEM] =====================================================');
console.log('[SYSTEM] ENGINE START'); 
console.log('[SYSTEM] =====================================================');

const fs = require('fs');
const path = require('path');
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

// =============================================================================
// PRÜFUNG DER DATENBANK-UMGEBUNGSVARIABLEN
// =============================================================================
const REQUIRED_DB_ENVS = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT'];
const missingDbEnvs = REQUIRED_DB_ENVS.filter(env => !process.env[env]);

if (missingDbEnvs.length > 0) {
  console.error(`[CRITICAL] ENGINE ABORT: Missing database environment variables: ${missingDbEnvs.join(', ')}`);
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

const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;

if (!SSL_KEY_PATH || !SSL_CERT_PATH) {
  console.error("[CRITICAL] ENGINE ABORT: SSL_KEY_PATH or SSL_CERT_PATH is not defined in environment variables!");
  process.exit(1);
}

const options = {
  key: fs.readFileSync(SSL_KEY_PATH),
  cert: fs.readFileSync(SSL_CERT_PATH)
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
// STUFE 2: FIREWALL & COUNTERMEASURES (MIT DYNAMISCHEM FALLBACK)
// =============================================================================
let firewall;
try {
  firewall = require('./server_core/firewall');
} catch (e) {
  console.log('[SYSTEM] [WARN] Private firewall.js not found. Using Open-Source pass-through fallback.');
  firewall = function(req, res, next) { next(); };
}
app.use(firewall); 

// =============================================================================
// STUFE 3: PERFORMANCE-LOGGER (Loggt INFO über console.log)
// =============================================================================
app.use((req, res, next) => {
  const startTime = process.hrtime();

  res.on('finish', () => {
    if (req.originalUrl.toLowerCase().includes('/api/admin/')) {      
      return; 
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
