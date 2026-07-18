// =============================================================================
// APPANDOR LOGISTICS: BACKEND DATABASE METRICS ROUTE (CRLF)
// =============================================================================

const express = require('express');
const router = express.Router();
const authenticateToken = require('./authMiddleware'); 

// =============================================================================
// 1. API: Ermittelt die exakte physikalische Größe der Datenbank in MB (CRLF)
// =============================================================================
router.get('/db-size', authenticateToken, async (req, res) => {
  const pool = req.app.get('db_pool');

  try {
    const query = `
      SELECT ROUND(pg_database_size(current_database()) / (1024.0 * 1024.0), 2) AS size_mb;
    `;
    const result = await pool.query(query);
    const databaseSizeMB = result.rows[0].size_mb;

    res.json({
      success: true,
      size_mb: databaseSizeMB
    });
  } catch (err) {
    console.error("[API Metrics DB-Size Error]:", err.message);
    res.status(500).json({ error: "Failed to stream database size metrics" });
  }
});

// =============================================================================
// 2. API: Ermittelt die Anzahl der aktuell aktiven Verbindungen (CRLF)
// =============================================================================
router.get('/db-connections', authenticateToken, async (req, res) => {
  const pool = req.app.get('db_pool');

  try {
    const query = `
      SELECT COUNT(*)::int AS active_conns 
      FROM pg_stat_activity 
      WHERE datname = current_database();
    `;
    const result = await pool.query(query);
    const connectionsCount = result.rows[0].active_conns;

    res.json({
      success: true,
      active_connections: connectionsCount
    });
  } catch (err) {
    console.error("[API Metrics DB-Connections Error]:", err.message);
    res.status(500).json({ error: "Failed to stream connection metrics" });
  }
});

// =============================================================================
// 3. API: Berechnet die Cache-Hit-Rate von PostgreSQL in % (CRLF)
// =============================================================================
router.get('/db-cache', authenticateToken, async (req, res) => {
  const pool = req.app.get('db_pool');

  try {
    const query = `
      SELECT 
        CASE 
          WHEN (blks_read + blks_hit) = 0 THEN '100.00 %'
          ELSE TO_CHAR(ROUND((blks_hit::numeric / (blks_read + blks_hit)::numeric) * 100, 2), 'FM990.00') || ' %'
        END AS cache_rate
      FROM pg_stat_database 
      WHERE datname = current_database();
    `;
    const result = await pool.query(query);
    
    // Falls für die DB noch keine Werte vorliegen (z.B. frisch erzeugt), sicheres Fallback
    const cacheHitRate = result.rows.length > 0 ? result.rows[0].cache_rate : "100.00 %";

    res.json({
      success: true,
      cache_hit_rate: cacheHitRate
    });
  } catch (err) {
    console.error("[API Metrics DB-Cache Error]:", err.message);
    res.status(500).json({ error: "Failed to stream database cache metrics" });
  }
});

module.exports = router;
