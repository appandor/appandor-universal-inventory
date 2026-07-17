// =============================================================================
// APPANDOR LOGISTICS: CENTRAL ENGINE FILE-LOGGER WITH 3-FILE ROTATION (CRLF)
// =============================================================================
const fs = require('fs');
const path = require('path');

const logFile0 = path.join(__dirname, 'combined.log');
const logFile1 = path.join(__dirname, 'combined.log.1');
const logFile2 = path.join(__dirname, 'combined.log.2');

let logStream = fs.createWriteStream(logFile0, { flags: 'a' });

const originalLog = console.log;
const originalError = console.error;

const MAX_SIZE = 100 * 1024 * 1024; // 100 MB Limit
const sizeInMB = Math.round(MAX_SIZE / (1024 * 1024));
let isRotating = false;

function formatLogEntry(type, args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  return `[${timestamp}] [${type}] ${message}\n`;
}

// DAS ROTATIONS-RAD: Behält maximal 3 Dateien im System (.log, .log.1, .log.2)
function handleRotation() {
  if (isRotating) return;
  isRotating = true;

  logStream.end(() => {
    // 1. Älteste Stufe (.2) restlos vom Server tilgen, falls vorhanden
    fs.unlink(logFile2, () => {
      // 2. Mittlere Stufe (.1) nach hinten schieben zu (.2)
      fs.rename(logFile1, logFile2, () => {
        // 3. Die gerade vollendete Live-Datei umbenennen zu (.1)
        fs.rename(logFile0, logFile1, (err) => {
          // 4. SOFORT den neuen, leeren Live-Stream öffnen
          logStream = fs.createWriteStream(logFile0, { flags: 'a' });
          isRotating = false;

          if (!err) {
            originalLog(`[File-Logger]: New logfile generated. Max size (${sizeInMB}MB) exceeded.`);            
          }
        });
      });
    });
  });
}

function writeAndCheck(logLine) {
  logStream.write(logLine);

  // Prüft die Dateigröße asynchron im Hintergrund
  if (!isRotating) {
    fs.stat(logFile0, (err, stats) => {
      if (!err && stats.size >= MAX_SIZE) {
        handleRotation();
      }
    });
  }
}

console.log = function(...args) {
  originalLog.apply(console, args);
  writeAndCheck(formatLogEntry('INFO', args));
};

console.error = function(...args) {
  originalError.apply(console, args);
  writeAndCheck(formatLogEntry('ERROR', args));
};

console.log(`[File-Logger]: Max logfile size set to ${sizeInMB}MB.`);            

// =============================================================================
// APPANDOR LOGISTICS: PLATFORM SERVICE INITIALIZATION
// =============================================================================
const express = require('express');
const https = require('https');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 443;
const JWT_SECRET = 'AppandorSecureCoreSecret2026!!!';

const pool = new Pool({
  user: 'appandor_admin',
  host: 'appandor_postgres',
  database: 'appandor_universal_inventory',
  password: 'EinSicheresDatenbankPasswort123!',
  port: 5432,
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
// AUTOMATISCHER REQUEST-LOGGER: Protokolliert Aufrufe und berechnet API-Latenz
// =============================================================================
global.appandor_latency_pool = []; // Globales RAM-Array für die Zeitmessung

app.use((req, res, next) => {
  const startTime = process.hrtime(); // Hochpräziser Start-Zeitstempel des Requests

  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    // Umrechnung der HR-Time in glatte Millisekunden
    const durationMs = Math.round((diff[0] * 1e3 + diff[1] / 1e6));

    // Schiebt die Millisekunden in den globalen Pool
    global.appandor_latency_pool.push(durationMs);

    // Deckelt das Array auf die letzten 100 Anfragen, damit das RAM niemals anschwillt
    if (global.appandor_latency_pool.length > 100) {
      global.appandor_latency_pool.shift();
    }

    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> Status: ${res.statusCode} (${durationMs}ms)`);
  });
  next();
});

// =============================================================================
// ZENTRALE SUCHMASCHINEN-SPERRE: Blockiert Google & Co. für das gesamte System
// =============================================================================
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'lp.html'));
});

app.get('/api/status', (req, res) => {
  res.json({ status: "alive", multi_tenancy: "ready", security: "https_secured" });
});

const authRouter = require('./routes/auth');
const inventoryRouter = require('./routes/inventory');
const productsRouter = require('./routes/products');
const inboundRouter = require('./routes/inbound');
const outboundRouter = require('./routes/outbound');
const adminRouter = require('./routes/admin');
const metricsRouter = require('./routes/metrics'); 

app.use('/api/auth', authRouter); 
app.use('/api/inventory', inventoryRouter);
app.use('/api/products', productsRouter);
app.use('/api/inbound', inboundRouter);
app.use('/api/outbound', outboundRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/metrics', metricsRouter);

app.get('/api/verify-session', (req, res) => {
  res.redirect(307, '/api/auth/verify-session');
});

fs.writeFile(path.join(__dirname, 'last_start_time'), 'System started', () => {});

https.createServer(options, app).listen(PORT, () => {
  console.log(`[Appandor Core] Secure HTTPS running live on port 443`);
});
