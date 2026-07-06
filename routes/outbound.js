const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'AppandorSecureCoreSecret2026!!!';

router.get('/active-boxes', async (req, res) => {
    const pool = req.app.get('db_pool');
    
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Access denied. Token missing." });
    }
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const activeTenantId = decoded.tenant_id;

        const query = `
            SELECT 
                b.box_id,
                l.site || ' - ' || l.zone || ' (' || l.slot || ')' AS storage_location,
                p.name AS product_name,
                p.barcode,
                tp.purchase_price_gross AS price,
                tp.status
            FROM boxes b
            JOIN tracked_products tp ON b.tracked_id = tp.tracked_id
            JOIN product_master p ON tp.product_id = p.product_id
            LEFT JOIN locations l ON b.location_id = l.location_id
            WHERE b.tenant_id = $1 AND tp.status = 'RECEIVED';
        `;
        const result = await pool.query(query, [activeTenantId]);
        res.json(result.rows);
    } catch (err) {
        console.error("[API Outbound Active Boxes Error]:", err.message);
        res.status(401).json({ error: "Invalid or expired session token." });
    }
});

module.exports = router;
