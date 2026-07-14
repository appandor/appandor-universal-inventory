// =============================================================================
// APPANDOR LOGISTICS: OUTBOUND TRANSACTION LEDGER (CRLF)
// =============================================================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authenticateToken = require('./authMiddleware'); 

// =============================================================================
// API: GET /api/outbound/active-boxes
// =============================================================================
router.get('/active-boxes', authenticateToken, async (req, res) => {
  const pool = req.app.get('db_pool');
  const activeTenantId = req.user.tenant_id;

  try {
    // SCHARFE KORREKTUR: SQL-Join über box_contents (bc) heilt den tracked_id Fehler!
    const query = `
      SELECT 
        b.box_id,
        COALESCE(l.site || ' - ' || l.zone || ' (' || l.slot || ')', 'Unplatziert') AS storage_location,
        p.name AS product_name,
        p.barcode,
        tp.purchase_price_gross AS price
      FROM boxes b
      LEFT JOIN locations l ON b.location_id = l.location_id
      INNER JOIN box_contents bc ON b.box_id = bc.box_id
      INNER JOIN tracked_products tp ON bc.tracked_id = tp.tracked_id
      INNER JOIN product_master p ON bc.product_id = p.product_id
      WHERE b.tenant_id = $1 AND COALESCE(tp.status, 'ORDERED') = 'RECEIVED'
      ORDER BY b.box_id ASC
    `;

    const result = await pool.query(query, [activeTenantId]);
    res.json(result.rows);

  } catch (err) {
    console.error("[API Outbound Active Boxes Error]:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;