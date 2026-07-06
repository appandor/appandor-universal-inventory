const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'AppandorSecureCoreSecret2026!!!';

// Hilfsfunktion: Überprüft das Ticket und liefert die scharfe tenant_id zurück
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

// 1. API: Holt die dynamischen Kategorien für das Dropdown
router.get('/categories', async (req, res) => {
    const pool = req.app.get('db_pool');
    const activeTenantId = getTenantId(req);

    if (!activeTenantId) return res.status(401).json({ error: "Unauthorized session token" });

    try {
        const query = `
            SELECT category_id, category_code, display_name 
            FROM product_categories 
            WHERE tenant_id = $1 
            ORDER BY display_name ASC;
        `;
        const result = await pool.query(query, [activeTenantId]);
        res.json(result.rows);
    } catch (err) {
        console.error("[API Categories Error]:", err.message);
        res.status(500).json({ error: "Failed to fetch categories" });
    }
});

// 2. API: Holt die Produkt-Stammdatenliste für die rechte Tabellenhälfte
router.get('/masters', async (req, res) => {
    const pool = req.app.get('db_pool');
    const activeTenantId = getTenantId(req);

    if (!activeTenantId) return res.status(401).json({ error: "Unauthorized session token" });

    try {
        const query = `
            SELECT p.product_id, p.name, p.barcode, p.minimum_stock, c.display_name AS category_name
            FROM product_master p
            LEFT JOIN product_categories c ON p.category_id = c.category_id
            WHERE p.tenant_id = $1
            ORDER BY p.created_at DESC;
        `;
        const result = await pool.query(query, [activeTenantId]);
        res.json(result.rows);
    } catch (err) {
        console.error("[API Product Masters Error]:", err.message);
        res.status(500).json({ error: "Failed to fetch product masters" });
    }
});

// 3. API: Speichert ein neues Produkt scharf unter der ID des angemeldeten Benutzers
router.post('/add', async (req, res) => {
    const pool = req.app.get('db_pool');
    const activeTenantId = getTenantId(req);

    if (!activeTenantId) return res.status(401).json({ error: "Unauthorized session token" });
    
    const { name, barcode, category_id, minimum_stock } = req.body;

    if (!name || !category_id) {
        return res.status(400).json({ error: "Product name and category are required" });
    }

    try {
        const query = `
            INSERT INTO product_master (tenant_id, category_id, barcode, name, minimum_stock)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING product_id, name;
        `;
        
        const values = [
            activeTenantId, 
            parseInt(category_id), 
            barcode || null, 
            name.trim(), 
            parseInt(minimum_stock) || 0
        ];
        
        const result = await pool.query(query, values);
        res.status(201).json({ message: "Product master successfully created", product: result.rows[0] });
    } catch (err) {
        console.error("[API Product Add Error]:", err.message);
        res.status(500).json({ error: "Failed to inject product into database" });
    }
});

module.exports = router;
