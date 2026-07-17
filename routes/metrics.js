// =============================================================================
// APPANDOR LOGISTICS: BACKEND METRICS ROUTE (CRLF)
// =============================================================================

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const authenticateToken = require('./authMiddleware'); 

// =============================================================================
// 1. API: Berechnet die Uptime über das Dateialter
// =============================================================================
router.get('/uptime', authenticateToken, (req, res) => {
  const bootTimeFilePath = path.join(__dirname, '../last_start_time');

  // Holt die Metadaten der Datei asynchron (Größe, Zeilen, Änderungsdatum)
  fs.stat(bootTimeFilePath, (err, stats) => {
    if (err) {
      console.error("[API Metrics] last_start_time file missing.", err.message);
      return res.status(500).json({ error: "Boot time record missing" });
    }

    // stats.mtime ist der unbestechliche Zeitstempel, wann die Datei beim Booten angelegt wurde
    const bootTimestamp = Math.floor(stats.mtime.getTime() / 1000);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    // Die Differenz ergibt die exakten Uptime-Sekunden
    const uptimeSeconds = currentTimestamp - bootTimestamp;

    res.json({ 
      success: true, 
      uptime_seconds: uptimeSeconds >= 0 ? uptimeSeconds : 0 
    });
  });
});

// =============================================================================
// 2. API: Ermittelt den aktuellen RAM-Verbrauch des Node-Prozessors (CRLF)
// =============================================================================
router.get('/ram', authenticateToken, (req, res) => {
  // rss (Resident Set Size) gibt den exakten RAM-Verbrauch im Docker-Container in Bytes an
  const memoryBytes = process.memoryUsage().rss;
  const memoryMegabytes = Math.round(memoryBytes / (1024 * 1024));

  res.json({
    success: true,
    ram_mb: memoryMegabytes
  });
});

// =============================================================================
// 3. API: Ermittelt den freien Festplattenspeicher der SSD in GB (CRLF)
// =============================================================================
router.get('/disk', authenticateToken, (req, res) => {
  const { exec } = require('child_process');

  // df -k /usr/src/app fragt den Speicherplatz der Partition ab, auf der die App läuft
  exec('df -k /usr/src/app', (error, stdout) => {
    if (error) {
      console.error("[API Metrics] Disk space check failed:", error.message);
      return res.status(500).json({ error: "Failed to read disk metrics" });
    }

    try {
      const lines = stdout.trim().split('\n');
      if (lines.length < 2) throw new Error("Invalid df output format");

      // Spaltet die zweite Zeile (die Datenzeile) nach Leerzeichen auf
      const parts = lines[1].replace(/\s+/g, ' ').split(' ');
      
      // Index 3 in der df-Ausgabe ist standardmäßig der verfügbare Speicherplatz in Kilobytes
      const availableKB = parseInt(parts[3], 10);
      const availableGB = Math.round(availableKB / (1024 * 1024)); // Umrechnung in GB

      res.json({
        success: true,
        disk_free_gb: availableGB
      });
    } catch (err) {
      console.error("[API Metrics Parse Error]:", err.message);
      res.status(500).json({ error: "Failed to parse disk metric output" });
    }
  });
});

// =============================================================================
// 4. API: Ermittelt den Status der Engine-Bereinigung (Garbage Collection) (CRLF)
// =============================================================================
router.get('/gc', authenticateToken, (req, res) => {
  const { performance, PerformanceObserver } = require('perf_hooks');

  let gcHappened = false;

  // Ein kurzzeitiger Observer im RAM, der die V8-Engine für eine Millisekunde belauscht
  const obs = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    if (entries.length > 0) {
      gcHappened = true;
    }
  });
  
  obs.observe({ entryTypes: ['gc'], buffered: false });

  // Wir geben der Engine einen winzigen Moment Zeit und liefern den Status zurück
  setTimeout(() => {
    obs.disconnect(); // Observer sofort wieder abbauen für maximale Performance
    
    res.json({
      success: true,
      gc_status: gcHappened ? "Aktiv (Optimierung)" : "Bereit (Optimal)"
    });
  }, 10);
});

// =============================================================================
// 5. API: Ermittelt den gleitenden Durchschnitt der API-Antwortzeit (CRLF)
// =============================================================================
router.get('/latency', authenticateToken, (req, res) => {
  const pool = global.appandor_latency_pool || [];

  if (pool.length === 0) {
    return res.json({ success: true, avg_latency_ms: 0 });
  }

  // Berechnet den mathematischen Durchschnitt aller gemessenen Werte im Array
  const sum = pool.reduce((acc, val) => acc + val, 0);
  const average = Math.round(sum / pool.length);

  res.json({
    success: true,
    avg_latency_ms: average
  });
});

module.exports = router;
