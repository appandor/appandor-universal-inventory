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

module.exports = router;
