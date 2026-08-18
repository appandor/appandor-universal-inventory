// =============================================================================
// APPANDOR LOGISTICS: SERVER METRICS ROUTES
// =============================================================================

const express = require('express');
const router = express.Router();
const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { PerformanceObserver } = require('perf_hooks');
const authenticateToken = require('./authMiddleware'); 

// Hilfsfunktion: Verpackt exec in ein modernes Promise für die Bündelung
const execPromise = (command) => {
  return new Promise((resolve) => {
    exec(command, (error, stdout) => {
      if (error) return resolve(null);
      resolve(stdout);
    });
  });
};

// =============================================================================
// NEU: ZENTRALER BÜNDELUNGS-ENDPUNKT (Reduziert HTTP-Traffic um 83,3 %)
// =============================================================================
router.get('/all', authenticateToken, async (req, res) => {
  const bootTimeFilePath = path.join(__dirname, '../last_start_time');
  const pool = global.appandor_latency_pool || [];

  // Vorbereitung für asynchrone parallele Abfragen (Uptime & Disk)
  const uptimePromise = fs.promises.stat(bootTimeFilePath).catch(() => null);
  const diskPromise = execPromise('df -k /usr/src/app');

  // Garbage Collection Observer für 10ms starten
  let gcHappened = false;
  const obs = new PerformanceObserver((list) => {
    if (list.getEntries().length > 0) gcHappened = true;
  });
  obs.observe({ entryTypes: ['gc'], buffered: false });

  // 10 Millisekunden warten, während die asynchronen Tasks im Hintergrund laufen
  const [uptimeStats, diskStdout] = await Promise.all([
    uptimePromise,
    diskPromise,
    new Promise(resolve => setTimeout(resolve, 10))
  ]);

  obs.disconnect(); // GC-Wächter sofort wieder abbauen

  // 1. Berechnung: Uptime
  let uptimeSeconds = 0;
  if (uptimeStats) {
    const bootTimestamp = Math.floor(uptimeStats.mtime.getTime() / 1000);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    uptimeSeconds = Math.max(0, currentTimestamp - bootTimestamp);
  }

  // 2. Berechnung: RAM
  const memoryMegabytes = Math.round(process.memoryUsage().rss / (1024 * 1024));

  // 3. Berechnung: Disk Space
  let availableGB = 0;
  if (diskStdout) {
    try {
      const lines = diskStdout.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].replace(/\s+/g, ' ').split(' ');
        const availableKB = parseInt(parts[3], 10);
        availableGB = Math.round(availableKB / (1024 * 1024));
      }
    } catch (e) {}
  }

  // 4. Berechnung: Latency
  let averageLatency = 0;
  if (pool.length > 0) {
    const sum = pool.reduce((acc, val) => acc + val, 0);
    averageLatency = Math.round(sum / pool.length);
  }

  // 5. Berechnung: CPU
  const cpuCores = os.cpus().length;
  const loadOneMinute = os.loadavg()[0]; 
  let cpuPercent = Math.min(100, Math.round((loadOneMinute / cpuCores) * 100));

  // Alle 6 Metriken unbestechlich in einem einzigen JSON-Paket ausliefern!
  res.json({
    success: true,
    uptime_seconds: uptimeSeconds,
    ram_mb: memoryMegabytes,
    disk_free_gb: availableGB,
    gc_status: gcHappened ? "Aktiv (Optimierung)" : "Bereit (Optimal)",
    avg_latency_ms: averageLatency,
    cpu_percent: cpuPercent
  });
});

// =============================================================================
// ABWÄRTSKOMPATIBILITÄT: Die alten Routen bleiben als Fallback intakt
// =============================================================================
router.get('/uptime', authenticateToken, (req, res) => {
  fs.stat(path.join(__dirname, '../last_start_time'), (err, stats) => {
    if (err) return res.status(500).json({ error: "Boot time record missing" });
    const uptimeSeconds = Math.floor(Date.now() / 1000) - Math.floor(stats.mtime.getTime() / 1000);
    res.json({ success: true, uptime_seconds: uptimeSeconds >= 0 ? uptimeSeconds : 0 });
  });
});

router.get('/ram', authenticateToken, (req, res) => {
  res.json({ success: true, ram_mb: Math.round(process.memoryUsage().rss / (1024 * 1024)) });
});

router.get('/disk', authenticateToken, (req, res) => {
  exec('df -k /usr/src/app', (error, stdout) => {
    if (error) return res.status(500).json({ error: "Failed to read disk metrics" });
    const parts = stdout.trim().split('\n')[1].replace(/\s+/g, ' ').split(' ');
    res.json({ success: true, disk_free_gb: Math.round(parseInt(parts[3], 10) / (1024 * 1024)) });
  });
});

router.get('/gc', authenticateToken, (req, res) => {
  let gcHappened = false;
  const obs = new PerformanceObserver((list) => { if (list.getEntries().length > 0) gcHappened = true; });
  obs.observe({ entryTypes: ['gc'], buffered: false });
  setTimeout(() => { obs.disconnect(); res.json({ success: true, gc_status: gcHappened ? "Aktiv (Optimierung)" : "Bereit (Optimal)" }); }, 10);
});

router.get('/latency', authenticateToken, (req, res) => {
  const pool = global.appandor_latency_pool || [];
  const average = pool.length === 0 ? 0 : Math.round(pool.reduce((acc, val) => acc + val, 0) / pool.length);
  res.json({ success: true, avg_latency_ms: average });
});

router.get('/cpu', authenticateToken, (req, res) => {
  res.json({ success: true, cpu_percent: Math.min(100, Math.round((os.loadavg()[0] / os.cpus().length) * 100)) });
});

module.exports = router;
