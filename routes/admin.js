// =============================================================================
// APPANDOR LOGISTICS: DATABASE SYSTEM INSPECTOR & CONTROL ENGINE (CRLF)
// =============================================================================

const express = require('express');
const router = express.Router();
const { exec } = require('child_process'); // Core-Modul für OS-Befehle
const authenticateToken = require('./authMiddleware'); 

// =============================================================================
// 1. API: Holt alle existierenden Tabellennamen dynamisch aus PostgreSQL
// =============================================================================
router.get('/tables', authenticateToken, async (req, res) => {
  const pool = req.app.get('db_pool');

  try {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("[API Admin Tables Error]:", err.message);
    res.status(500).json({ error: "Failed to fetch database schema" });
  }
});

// =============================================================================
// 2. API: Holt die Rohdaten (Mit unkompliziertem Existenz-Check vor dem SELECT!)
// =============================================================================
router.get('/table/:name', authenticateToken, async (req, res) => {
  const pool = req.app.get('db_pool');
  const activeTenantId = req.user.tenant_id;
  const tableName = req.params.name;

  try {
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = $1
      );
    `;
    const checkResult = await pool.query(checkQuery, [tableName]);
    const tableExists = checkResult.rows[0].exists; // Unbestechlicher PG-Pfad

    if (!tableExists) {
      return res.status(400).json({ error: "Access denied: Table does not exist." });
    }

    const finalQuery = `SELECT * FROM ${tableName} WHERE tenant_id = $1;`;
    const result = await pool.query(finalQuery, [activeTenantId]);
    res.json(result.rows);

  } catch (err) {
    console.error(`[API Admin Inspect ${tableName} Error]:`, err.message);
    res.status(500).json({ error: `Failed to stream ledger lines from ${tableName}` });
  }
});

// =============================================================================
// 3. API: System-Steuerung (Zentraler Befehls-Verteiler für den Toggle-Bereich)
// =============================================================================
router.post('/system/execute', authenticateToken, (req, res) => {
  const { action } = req.body;

  if (!action) {
    return res.status(400).json({ error: "Missing control action token." });
  }

  // Hier hinterlegen wir die erlaubten OS-Kommandos bockelfest im Backend
  let commandToExecute = "";

  if (action === "restart_node") {
      commandToExecute = "touch /usr/src/app/web/public/.restart_trigger";
  } else {
    return res.status(400).json({ error: "Unknown or untracked system control command." });
  }

  console.log(`[SYSTEM CONTROL]: Einleitung der Aktion '${action}' -> Befehl: ${commandToExecute}`);

  // Ausführung auf dem Betriebssystem des Servers
  exec(commandToExecute, (error, stdout, stderr) => {
    if (error) {
      console.error(`[OS Exec Error]: ${error.message}`);
      return res.status(500).json({ error: "System command execution failed", details: error.message });
    }
    
    res.json({ success: true, stdout: stdout || "Command triggered successfully." });
  });
});

// =============================================================================
// 4. API: Führt administrative SQL-Befehle direkt auf dem PostgreSQL-Host aus
// =============================================================================
router.post('/execute-sql', authenticateToken, async (req, res) => {
  const pool = req.app.get('db_pool');
  const { query } = req.body;

  if (!query || query.trim() === "") {
    return res.status(400).json({ error: "Kein SQL-Befehl empfangen." });
  }

  try {
    console.log(`[API Admin SQL Exec]: Befehl wird ausgeführt: ${query.substring(0, 60)}...`);
    
    // Führt das SQL-Statement direkt über den zentralen Pool aus
    const result = await pool.query(query);
    const affectedRows = result.rowCount !== null ? result.rowCount : 0;

    res.json({ 
      success: true, 
      message: `Befehl erfolgreich ausgeführt. Betroffene Zeilen: ${affectedRows}` 
    });

  } catch (err) {
    console.error("[API Admin SQL Exec Error]:", err.message);
    // Liefert das exakte DB-Fehler-Feedback an die Konsole zurück
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 5. API: Liest die aktuellsten System-Logs (Kombination aus log.1 und log) aus (CRLF)
// =============================================================================
router.get('/logs', authenticateToken, (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const logFile0Path = path.join(__dirname, '../combined.log'); 
  const logFile1Path = path.join(__dirname, '../combined.log.1'); 

  console.log('[API Admin Logs]: Operator fordert System-Protokolle an.');

  // 1. Zuerst prüfen wir asynchron, ob die ältere combined.log.1 existiert
  fs.readFile(logFile1Path, 'utf8', (err1, data1) => {
    const historicalLogs = !err1 ? data1 : ''; // Falls Fehler (z.B. Datei nicht da), einfach leer lassen

    // 2. Jetzt lesen wir die aktuelle, aktive combined.log aus
    fs.readFile(logFile0Path, 'utf8', (err0, data0) => {
      if (err0) {
        // Falls selbst die Haupt-Logdatei fehlt, schicken wir den sauberen Fallback
        console.error('[API Admin Logs Read Error]:', err0.message);
        return res.json({ 
          logs: '[System]: Live pipeline connected.\n[System]: Awaiting fresh engine cycle transactions.' 
        });
      }

      // 3. Wir verheiraten die Historie unbestechlich mit den frischen Live-Zeilen
      const combinedData = historicalLogs + data0;

      // 4. Holt die letzten 100 Zeilen aus dem kombinierten Gesamt-String
      const lines = combinedData.trim().split('\n');
      const lastLines = lines.slice(-100).join('\n');

      res.json({ logs: lastLines });
    });
  });
});

module.exports = router;
