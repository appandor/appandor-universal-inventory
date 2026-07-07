const express = require('express');
const router = express.Router();
const authenticateToken = require('./authMiddleware'); 

// ROUTE: GET /api/inventory (Durch den Wächter geschützt)
router.get('/', authenticateToken, async (req, res) => {
    const pool = req.app.get('db_pool');
    
    // Die tenant_id wurde bereits atomsicher von der Middleware ermittelt und bereitgestellt!
    const activeTenantId = req.user.tenant_id; 

    try {
        // KORREKTUR: INNER JOINs erzwingen, dass nur Boxen MIT physischem Inhalt (RECEIVED) gelistet werden!
        const query = `
            SELECT 
                b.box_id,
                COALESCE(l.site || ' - ' || l.zone || ' (' || l.slot || ')', 'Unplatziert') AS storage_location,
                p.name AS product_name,
                p.barcode,
                tp.purchase_price_gross AS price,
                tp.status
            FROM boxes b
            LEFT JOIN locations l ON b.location_id = l.location_id
            INNER JOIN box_contents bc ON b.box_id = bc.box_id
            INNER JOIN tracked_products tp ON bc.tracked_id = tp.tracked_id
            INNER JOIN product_master p ON bc.product_id = p.product_id
            WHERE b.tenant_id = $1 AND tp.status = 'RECEIVED'
            ORDER BY b.box_id;
        `;
        
        const result = await pool.query(query, [activeTenantId]);
        res.json(result.rows);
        
    } catch (err) {
        console.error("[API Inventory Dynamic SQL Error]:", err.message);
        res.status(500).json({ error: "Internal Server Error during ledger lookup." });
    }
});

module.exports = router;
