const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'AppandorSecureCoreSecret2026!!!';

// Hilfsfunktion zur Ticket-Überprüfung
function getTenantId(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.tenant_id;
    } catch (err) {
        return null;
    }
}

// API: Holt alle Einkäufe für die Tabelle (Nach Mandant gefiltert)
router.get('/purchases', async (req, res) => {
    const pool = req.app.get('db_pool');
    const activeTenantId = getTenantId(req);

    if (!activeTenantId) return res.status(401).json({ error: "Unauthorized session token" });

    try {
        const query = `
            SELECT 
                t.tracked_id, 
                t.purchased_at, 
                t.purchase_price_gross as price, 
                t.estimated_delivery, 
                CASE WHEN t.status = 'RECEIVED' THEN t.created_at ELSE NULL END as received_at, 
                t.status, 
                t.quantity,
                p.name as product_name, 
                p.barcode 
            FROM tracked_products t
            JOIN product_master p ON t.product_id = p.product_id
            WHERE t.tenant_id = $1
            ORDER BY t.purchased_at DESC;
        `;
        const result = await pool.query(query, [activeTenantId]);
        res.json(result.rows);
    } catch (err) {
        console.error("[API Inbound Purchases Error]:", err.message);
        res.status(500).json({ error: "Failed to fetch inbound purchases" });
    }
});

// API-Route zum Buchen eines neuen Einkaufs
router.post('/add', async (req, res) => {
    const pool = req.app.get('db_pool');
    const activeTenantId = getTenantId(req);

    if (!activeTenantId) return res.status(401).json({ error: "Unauthorized session token" });

    const { product_id, purchased_at, purchase_price_gross, estimated_delivery, quantity } = req.body;

    if (!product_id || !purchased_at || !purchase_price_gross) {
        return res.status(400).json({ error: "Product, purchase date and price are strictly required" });
    }

    try {
        const query = `
            INSERT INTO tracked_products (tenant_id, product_id, purchased_at, purchase_price_gross, estimated_delivery, quantity, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'ORDERED')
            RETURNING tracked_id;
        `;
        const values = [
            activeTenantId,
            parseInt(product_id),
            purchased_at,
            parseFloat(purchase_price_gross),
            estimated_delivery || null,
            parseInt(quantity || 1)
        ];

        await pool.query(query, values);
        res.status(201).json({ message: "Inbound purchase successfully ordered" }); // KORREKTUR: Status 201 statt falschem 21!
    } catch (err) {
        console.error("[API Inbound Add Error]:", err.message);
        res.status(500).json({ error: "Failed to inject ordered purchase into database" });
    }
});

module.exports = router;
