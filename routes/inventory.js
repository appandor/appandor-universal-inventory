const express = require('express');
const router = express.Router();
const authenticateToken = require('./authMiddleware'); 

// =============================================================================
// API: GET /api/inventory (HEILT DIE GEISTERBOX OHNE GROUP-BY)
// =============================================================================
router.get('/', authenticateToken, async (req, res) => {
  const pool = req.app.get('db_pool');
  const activeTenantId = req.user.tenant_id;

  try {
    const query = `
      SELECT 
        b.box_id,
        COALESCE(l.site || ' - ' || l.zone || ' (' || l.slot || ')', 'Unplatziert') AS storage_location,
        p.name AS product_name,
        p.barcode,
        tp.purchase_price_gross AS price,
        tp.status AS logistics_status
      FROM boxes b
      LEFT JOIN locations l ON b.location_id = l.location_id
      INNER JOIN box_contents bc ON b.box_id = bc.box_id          -- UNBESTECHLICH: Schließt leere Boxen (APP-BOX-001) sofort aus!
      INNER JOIN tracked_products tp ON bc.tracked_id = tp.tracked_id -- Garantiert, dass der Artikel existiert
      INNER JOIN product_master p ON bc.product_id = p.product_id     -- Holt den echten Namen
      WHERE b.tenant_id = $1 
        AND tp.status = 'RECEIVED' -- Filtert alle reinen Bestellungen (ORDERED) aus
      ORDER BY b.box_id ASC;
    `;

    const result = await pool.query(query, [activeTenantId]);
    res.json(result.rows);

  } catch (err) {
    console.error("[API Inventory Error]:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// ROUTE: GET /api/inventory
router.get('/x', authenticateToken, async (req, res) => {
    const pool = req.app.get('db_pool');
    const activeTenantId = req.user.tenant_id; 
    const queryParams = [activeTenantId];

    try {
        let query = `
            SELECT 
                b.box_id,
                COALESCE(l.site || ' - ' || l.zone || ' (' || l.slot || ')', 'Unplatziert') AS storage_location,
                p.name AS product_name,
                p.barcode,
                tp.purchase_price_gross AS price,
                COALESCE(tp.status, 'ORDERED') AS status
            FROM boxes b
            LEFT JOIN locations l ON b.location_id = l.location_id
            LEFT JOIN box_contents bc ON b.box_id = bc.box_id
            LEFT JOIN tracked_products tp ON bc.tracked_id = tp.tracked_id
            LEFT JOIN product_master p ON bc.product_id = p.product_id
            WHERE b.tenant_id = $1
        `;

        // 1. DYNAMISCHE FILTERUNG (STATUS)
        if (req.query.status) {
            const statusArray = req.query.status.split(',').map(s => s.trim());
            const placeholders = statusArray.map((_, index) => `$${index + 2}`).join(', ');
            
            query += ` AND COALESCE(tp.status, 'ORDERED') IN (${placeholders})`;
            queryParams.push(...statusArray);
        }

        // 2. DYNAMISCHE SORTIERUNG (ORDERBY)
        let orderByClause = '';
        
        if (req.query.orderby) {
            // Erlaubte Spalten-Namen definieren (Sicherheitsnetz gegen SQL-Injections)
            const allowedColumns = {
                'box_id': 'b.box_id',
                'storage_location': "CASE WHEN b.location_id IS NULL THEN 1 ELSE 0 END, l.site, l.zone, l.slot",
                'product_name': 'p.name',
                'barcode': 'p.barcode',
                'price': 'tp.purchase_price_gross',
                'status': "COALESCE(tp.status, 'ORDERED')"
            };

            const orderFields = req.query.orderby.split(',').map(f => f.trim());
            const validFields = [];

            orderFields.forEach(field => {
                if (allowedColumns[field]) {
                    validFields.push(allowedColumns[field]);
                }
            });

            if (validFields.length > 0) {
                orderByClause = ` ORDER BY ${validFields.join(', ')}`;
            }
        }

        // 3. DEFAULT-SORTIERUNG (Falls kein Query-Parameter übergeben wurde)
        if (!orderByClause) {
            // Sortiert erst nach belegten Lagerplätzen (unplatzierte Boxen landen am Ende), dann nach Box-ID
            orderByClause = ` ORDER BY CASE WHEN b.location_id IS NULL THEN 1 ELSE 0 END, l.site, l.zone, l.slot, b.box_id`;
        }

        query += orderByClause;
        
        const result = await pool.query(query, queryParams);
        res.json(result.rows);
        
    } catch (err) {
        console.error("[API Inventory Dynamic SQL Error]:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
