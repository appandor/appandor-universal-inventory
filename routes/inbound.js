const express = require('express');
const router = express.Router();
const authenticateToken = require('./authMiddleware'); 

// =============================================================================
// ROUTE: POST /api/inbound/add (Bestellungs-Einkauf vorab registrieren)
// =============================================================================
router.post('/add', authenticateToken, async (req, res) => {
    const pool = req.app.get('db_pool');
    const activeTenantId = req.user.tenant_id;

    const { product_id, purchased_at, purchase_price_gross, estimated_delivery, quantity } = req.body;
    if (!product_id || !purchased_at || !purchase_price_gross) {
        return res.status(400).json({ error: "Product, purchase date and price are required" });
    }

    try {
        const query = `
            INSERT INTO tracked_products (tenant_id, product_id, purchased_at, purchase_price_gross, estimated_delivery, quantity, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'ORDERED');
        `;

        // UNBESTECHLICHER LEERSTRING-SCHUTZ: Verhindert, dass leere Frontend-Felder die DB crashen!
        const cleanDelivery = (estimated_delivery && estimated_delivery.trim() !== "") ? estimated_delivery : null;
        const cleanPurchased = (purchased_at && purchased_at.trim() !== "") ? purchased_at : CURRENT_DATE;

        await pool.query(query, [
            activeTenantId,
            parseInt(product_id),
            cleanPurchased,
            parseFloat(purchase_price_gross),
            cleanDelivery,
            parseInt(quantity || 1)
        ]);
        
        return res.status(201).json({ message: "Inbound purchase successfully ordered" });
    } catch (err) {
        console.error("[API Inbound Add SQL Error]:", err.message);
        return res.status(500).json({ error: "Failed to inject ordered purchase" });
    }
});

// =============================================================================
// ROUTE: GET /api/inbound/masters (Liefert die Produktvorlagen fürs Dropdown)
// =============================================================================
router.get('/masters', authenticateToken, async (req, res) => {
    const pool = req.app.get('db_pool');
    const activeTenantId = req.user.tenant_id;

    try {
        const result = await pool.query(
            'SELECT product_id, name, barcode FROM product_master WHERE tenant_id = $1 ORDER BY name',
            [activeTenantId]
        );
        return res.json(result.rows);
    } catch (err) {
        console.error("[Inbound GET Masters Error]:", err.message);
        res.status(500).json({ error: "Failed to fetch master templates" });
    }
});

// =============================================================================
// 1. ROUTE: GET /api/inbound/purchases (Holt alle Einkäufe für die Tabelle)
// =============================================================================
router.get('/purchases', authenticateToken, async (req, res) => {
    const pool = req.app.get('db_pool');
    const activeTenantId = req.user.tenant_id;

    try {
        // KORREKTUR: t.created_at wird genutzt, da t.updated_at in Table 3 nicht existiert!
        const query = `
            SELECT t.tracked_id, 
                   t.product_id, 
                   t.purchased_at, 
                   t.purchase_price_gross as price, 
                   t.estimated_delivery, 
                   t.expiry_date, 
                   t.status, 
                   t.quantity,
                   CASE 
                       WHEN t.status = 'RECEIVED' THEN t.created_at 
                       ELSE NULL 
                   END as received_at,
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

// =============================================================================
// ROUTE: GET /api/inbound/locations-list (Liefert alle scanbaren Plätze fürs Modal)
// =============================================================================
router.get('/locations-list', authenticateToken, async (req, res) => {
    const pool = req.app.get('db_pool');
    const tenant_id = 1; // Hardcoded für Entwicklung

    try {
        const result = await pool.query(
            'SELECT location_code, site, zone, slot FROM locations WHERE tenant_id = $1 ORDER BY site, zone, slot',
            [tenant_id]
        );
        return res.json(result.rows);
    } catch (err) {
        console.error("[Inbound GET Locations List Error]:", err.message);
        return res.status(500).json({ error: "ERR_SERVER_CRASH" });
    }
});

// =============================================================================
// ROUTE: GET /api/inbound/boxes-list/:product_id (Liefert zulässige Boxen)
// =============================================================================
// =============================================================================
// 4. ROUTE: GET /api/inbound/boxes-list/:product_id (Filtert Boxen nach Attributen)
// =============================================================================
router.get('/boxes-list/:product_id', authenticateToken, async (req, res) => {
    const pool = req.app.get('db_pool');
    const activeTenantId = req.user.tenant_id;
    const productId = req.params.product_id;

    try {
        // 1. Wir holen uns zuerst die strengen logistischen Anforderungen des Produkts
        const productResult = await pool.query(
            'SELECT attributes FROM product_master WHERE product_id = $1 AND tenant_id = $2',
            [productId, activeTenantId]
        );
        
        if (productResult.rows.length === 0) {
            return res.json([]); // Wenn kein Produkt gefunden, leeres Dropdown
        }
        
        const attributes = productResult.rows[0].attributes || {};
        const requiresAirtight = attributes.requires_airtight || false;
        const requiresOpaque = attributes.requires_opaque || false;

        // 2. Jetzt filtern wir die Boxen unbestechlich direkt auf Datenbank-Ebene!
        const query = `
            SELECT DISTINCT b.box_id, l.site, l.zone, l.slot 
            FROM boxes b
            LEFT JOIN locations l ON b.location_id = l.location_id
            LEFT JOIN box_contents bc ON b.box_id = bc.box_id
            WHERE b.tenant_id = $1 
              AND b.is_virtual = FALSE 
              -- Sortenreinheit prüfen: Box leer oder identisches Produkt
              AND (bc.product_id IS NULL OR bc.product_id = $2)
              -- Luftdichtigkeit prüfen: Wenn benötigt, muss die Box es erfüllen
              AND ($3 = FALSE OR b.is_airtight = TRUE)
              -- Blickdichtigkeit prüfen: Wenn benötigt, muss die Box es erfüllen
              AND ($4 = FALSE OR b.is_opaque = TRUE)
            ORDER BY b.box_id;
        `;
        
        const result = await pool.query(query, [
            activeTenantId, 
            productId, 
            requiresAirtight, 
            requiresOpaque
        ]);
        
        return res.json(result.rows);
    } catch (err) {
        console.error("[Inbound GET Boxes List Smart Filter Error]:", err.message);
        return res.status(500).json({ error: "ERR_SERVER_CRASH" });
    }
});

router.get('/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxboxes-list/:product_id', authenticateToken, async (req, res) => {
    const pool = req.app.get('db_pool');
    const tenant_id = 1;
    const productId = req.params.product_id;

    try {
        // Findet alle echten Boxen, die entweder komplett leer sind ODER
        // die bereits genau dieses Produkt gelagert haben (Sortenreinheits-Erlaubnis)
        const result = await pool.query(
            'SELECT DISTINCT b.box_id, l.site, l.zone, l.slot ' +
            'FROM boxes b ' +
            'LEFT JOIN locations l ON b.location_id = l.location_id ' +
            'LEFT JOIN box_contents bc ON b.box_id = bc.box_id ' +
            'WHERE b.tenant_id = $1 AND b.is_virtual = FALSE AND (' +
            '  bc.product_id IS NULL OR bc.product_id = $2' +
            ') ORDER BY b.box_id',
            [tenant_id, productId]
        );
        return res.json(result.rows);
    } catch (err) {
        console.error("[Inbound GET Boxes List Error]:", err.message);
        return res.status(500).json({ error: "ERR_SERVER_CRASH" });
    }
});

// =============================================================================
// ROUTE: POST /api/inbound/receive (Kaufmännisches Wareneingangs-Zentrum)
// =============================================================================
router.post('/receive',authenticateToken, async (req, res) => {
    const pool = req.app.get('db_pool');
    
    // 1. ANFRAGEDATEN ENTGEGENNEHMEN
    // Das Frontend schickt uns diese strukturierten Werte aus dem Modal
    const { 
        tracked_id, 
        qty_received, 
        expiry_date, 
        location_code, // Optional: Scan-Code vom Regalbrettl
        box_id        // Optional: Scan-Code von der physischen Kiste
    } = req.body;

    // Hardcodierter Tenant für die Entwicklung (wird später über JWT dynamisch gezogen)
    const tenant_id = 1; 

    try {
        // =====================================================================
        // ABSCHNITT A: SCAN-CODES AUFLÖSEN & VALIDIEREN
        // =====================================================================
        
        // A1. Ursprüngliche Bestellung (Tracked Product) prüfen
        const trackedResult = await pool.query(
            'SELECT * FROM tracked_products WHERE tracked_id = $1 AND tenant_id = $2 AND status = \'ORDERED\'',
            [tracked_id, tenant_id]
        );
        
        if (trackedResult.rows.length === 0) {
            return res.status(400).json({ error: "ERR_ORDER_NOT_FOUND" });
        }
        const originalOrder = trackedResult.rows[0];

        // A2. Validierung der Menge
        if (!qty_received || qty_received <= 0 || qty_received > originalOrder.quantity) {
            return res.status(400).json({ error: "ERR_INVALID_QUANTITY" });
        }

        // A3. Produkt-Stammdaten laden (wegen den JSONB-Eigenschaften)
        const productResult = await pool.query(
            'SELECT * FROM product_master WHERE product_id = $1 AND tenant_id = $2',
            [originalOrder.product_id, tenant_id]
        );
        const productMaster = productResult.rows[0];
        const attributes = productMaster.attributes || {};

        // A4. Regalplatz auflösen, falls ein Code gescannt wurde
        let resolvedLocationId = null;
        let locationMaster = null;

        if (location_code && location_code.trim() !== "") {
            const locResult = await pool.query(
                'SELECT * FROM locations WHERE location_code = $1 AND tenant_id = $2',
                [location_code.trim(), tenant_id]
            );
            if (locResult.rows.length === 0) {
                return res.status(404).json({ error: "ERR_LOCATION_CODE_NOT_FOUND" });
            }
            locationMaster = locResult.rows[0];
            resolvedLocationId = locationMaster.location_id;
        }

        // =====================================================================
        // ABSCHNITT B: LOGISTISCHE PRÜFUNGEN (Temperatur, Schutz, Volumen)
        // =====================================================================
        
        // B1. Prüfung auf manuellen Platz-Block (is_locked)
        if (locationMaster && locationMaster.is_locked) {
            return res.status(400).json({ error: "ERR_LOCATION_MANUALLY_LOCKED" });
        }

        // B2. Auflösung und Prüfung der gescannten physischen Box (KORREKTUR: Mobile Leer-Boxen)
        let boxMaster = null;
        if (box_id && box_id.trim() !== "") {
            const boxResult = await pool.query(
                'SELECT * FROM boxes WHERE box_id = $1 AND tenant_id = $2',
                [box_id.trim(), tenant_id]
            );
            
            if (boxResult.rows.length === 0) {
                return res.status(404).json({ error: "ERR_BOX_NOT_FOUND" });
            }
            boxMaster = boxResult.rows[0];

            // WICHTIGE REPARATUR: Wir prüfen, ob die Box aktuell überhaupt Inhalt hat
            const boxContentCount = await pool.query(
                'SELECT COUNT(*) as count FROM box_contents WHERE box_id = $1',
                [boxMaster.box_id]
            );
            const isBoxEmpty = parseInt(boxContentCount.rows[0].count) === 0;

            if (!isBoxEmpty && boxMaster.location_id && resolvedLocationId && boxMaster.location_id !== resolvedLocationId) {
                // Nur wenn die Box BEREITS WARE ENTHÄLT, darf sie nicht an einen anderen Platz gebucht werden!
                return res.status(400).json({ error: "ERR_BOX_LOCATION_MISMATCH" });
            }
            
            // Wenn die Box leer ist ODER noch keinen Platz hatte, zieht sie jetzt an den gescannten Platz um
            if ((isBoxEmpty || !resolvedLocationId) && boxMaster.location_id) {
                // Wir erlauben dem System weiter unten in Abschnitt C2, die location_id der Box zu überschreiben
                if (!resolvedLocationId) {
                    resolvedLocationId = boxMaster.location_id;
                    const activeLoc = await pool.query('SELECT * FROM locations WHERE location_id = $1', [resolvedLocationId]);
                    locationMaster = activeLoc.rows[0];
                }
            }
        }

        // B3. Umgebungs-Sperre (Temperatur-Matching)
        if (locationMaster) {
            const requiredEnv = attributes.required_environment || 'AMBIENT';
            if (locationMaster.environment_type !== requiredEnv) {
                return res.status(400).json({ error: "ERR_ENVIRONMENT_MISMATCH" });
            }
            
            // Falls Box gescannt, muss auch diese das Klima vertragen
            if (boxMaster && boxMaster.allowed_environment !== locationMaster.environment_type) {
                return res.status(400).json({ error: "ERR_BOX_ENVIRONMENT_MISMATCH" });
            }
        }

        // B4. Physischer Schutz-Check (Luftdicht / Blickdicht)
        const requiresAirtight = attributes.requires_airtight || false;
        const requiresOpaque = attributes.requires_opaque || false;

        if (requiresAirtight || requiresOpaque) {
            // Wenn Schutz gefordert ist, ist eine Virtuelle Box (lose Lagerung) verboten!
            if (!boxMaster || boxMaster.is_virtual) {
                return res.status(400).json({ error: "ERR_PHYSICAL_PROTECTION_REQUIRED" });
            }
            
            // Eigenschaften der physischen Kiste abgleichen
            if (requiresAirtight && !boxMaster.is_airtight) {
                return res.status(400).json({ error: "ERR_BOX_NOT_AIRTIGHT" });
            }
            if (requiresOpaque && !boxMaster.is_opaque) {
                return res.status(400).json({ error: "ERR_BOX_NOT_OPAQUE" });
            }
        }

        // B5. Sortenreinheit bei echten physischen Boxen erzwingen
        if (boxMaster && !boxMaster.is_virtual) {
            const contentCheck = await pool.query(
                'SELECT DISTINCT product_id FROM box_contents WHERE box_id = $1 AND tenant_id = $2',
                [boxMaster.box_id, tenant_id]
            );
            if (contentCheck.rows.length > 0 && contentCheck.rows[0].product_id !== originalOrder.product_id) {
                return res.status(400).json({ error: "ERR_BOX_NOT_HOMOGENEOUS" });
            }
            
            // Kapazitätsgrenze der physischen Kiste prüfen
            const maxInBox = parseInt(attributes.max_qty_in_physical_box || 9999);
            const currentInBoxResult = await pool.query(
                'SELECT SUM(quantity) as total FROM tracked_products tp JOIN box_contents bc ON tp.tracked_id = bc.tracked_id WHERE bc.box_id = $1',
                [boxMaster.box_id]
            );
            const currentInBox = parseInt(currentInBoxResult.rows[0].total || 0);
            if (currentInBox + qty_received > maxInBox) {
                return res.status(400).json({ error: "ERR_BOX_OVERFLOW" });
            }
        }

        // B6. Atmende Volumen-Prüfung für das gesamte Regalbrett (V1 + V2 < 100%)
        if (locationMaster) {
            // Hole alle Produkte, die aktuell über Boxen (echt oder virtuell) auf diesem Stellplatz liegen
            const shelfContent = await pool.query(
                'SELECT tp.product_id, tp.quantity, pm.attributes FROM tracked_products tp ' +
                'JOIN box_contents bc ON tp.tracked_id = bc.tracked_id ' +
                'JOIN boxes b ON bc.box_id = b.box_id ' +
                'JOIN product_master pm ON tp.product_id = pm.product_id ' +
                'WHERE b.location_id = $1 AND tp.tenant_id = $2',
                [resolvedLocationId, tenant_id]
            );

            let usedVolume = 0;
            shelfContent.rows.forEach(row => {
                const itemShare = parseInt(row.attributes?.volume_share_per_unit || 0);
                usedVolume += (row.quantity * itemShare);
            });

            // Volumen des neu einzubuchenden Pakets dazurechnen
            const newUnitShare = parseInt(attributes.volume_share_per_unit || 0);
            const incomingVolume = qty_received * newUnitShare;

            if (usedVolume + incomingVolume > locationMaster.max_volume_capacity) {
                return res.status(400).json({ error: "ERR_LOCATION_VOLUME_OVERFLOW" });
            }
        }

        // =====================================================================
        // ABSCHNITT C: DATENBANK-AKTION & MENGEN-SPLITTING (SQL Transaktion)
        // =====================================================================
        
        // Da wir mehrere Tabellen gleichzeitig manipulieren, starten wir eine 
        // atomsichere Transaktion. Schlägt ein Schritt fehl, rollt die DB alles zurück.
        await pool.query('BEGIN');

        let finalBoxId = box_id ? box_id.trim() : null;

        // C1. Virtuelle Box generieren oder finden, falls keine physische Box gescannt wurde
        if (!finalBoxId && resolvedLocationId) {
            // Wir prüfen, ob für dieses Produkt auf diesem Regalplatz bereits eine Virtuelle Box existiert
            const existingVBox = await pool.query(
                'SELECT b.box_id FROM boxes b ' +
                'JOIN box_contents bc ON b.box_id = bc.box_id ' +
                'WHERE b.location_id = $1 AND bc.product_id = $2 AND b.is_virtual = TRUE AND b.tenant_id = $3 ' +
                'LIMIT 1',
                [resolvedLocationId, originalOrder.product_id, tenant_id]
            );

            if (existingVBox.rows.length > 0) {
                // Symmetrie-Erfolg: Wir nutzen die bereits existierende virtuelle Box einfach mit
                finalBoxId = existingVBox.rows[0].box_id;
            } else {
                // Eine neue, atmende Virtuelle Box auf diesem Brett erzeugen
                const timestampId = Date.now(); 
                finalBoxId = `VBOX-${originalOrder.product_id}-${timestampId}`;
                
                await pool.query(
                    'INSERT INTO boxes (box_id, tenant_id, location_id, is_virtual, allowed_environment) VALUES ($1, $2, $3, TRUE, $4)',
                    [finalBoxId, tenant_id, resolvedLocationId, locationMaster ? locationMaster.environment_type : 'AMBIENT']
                );
            }
        }

        // C2. Eine Box ohne festen Platz an den gescannten Regalplatz binden
        if (boxMaster && !boxMaster.location_id && resolvedLocationId) {
            await pool.query(
                'UPDATE boxes SET location_id = $1, updated_at = CURRENT_TIMESTAMP WHERE box_id = $2',
                [resolvedLocationId, boxMaster.box_id]
            );
        }

        // C3. Das mathematische Mengen-Splitting ausführen
        let targetTrackedId = tracked_id;
        const keepBackorder = req.body.keep_backorder !== false; // Standardmäßig true, falls nicht gesendet

        if (qty_received < originalOrder.quantity) {
            // SZENARIO A: Teilmenge wurde geliefert
            if (keepBackorder) {
                // FALL A1: Nachlieferung folgt (Der Rest bleibt als 'ORDERED' bestehen)
                const remainingQty = originalOrder.quantity - qty_received;
                await pool.query(
                    'UPDATE tracked_products SET quantity = $1 WHERE tracked_id = $2',
                    [remainingQty, tracked_id]
                );
            } else {
                // FALL A2: Rest stornieren (Wir löschen oder setzen die Ursprungszeile auf 0)
                // Da wir die Historie der Bestellung nicht komplett vernichten wollen, setzen wir 
                // die ursprüngliche Zeile einfach auf den Status 'SOLD' oder löschen sie sauber:
                await pool.query('DELETE FROM tracked_products WHERE tracked_id = $1', [tracked_id]);
            }

            // Für die tatsächlich physisch gelieferte Menge erzeugen wir immer den neuen 'RECEIVED'-Eintrag
            const splitInsert = await pool.query(
                'INSERT INTO tracked_products (tenant_id, product_id, purchased_at, purchase_price_gross, estimated_delivery, expiry_date, quantity, status) ' +
                'VALUES ($1, $2, $3, $4, $5, $6, $7, \'RECEIVED\') RETURNING tracked_id',
                [tenant_id, originalOrder.product_id, originalOrder.purchased_at, originalOrder.purchase_price_gross, originalOrder.estimated_delivery, expiry_date || null, qty_received]
            );
            targetTrackedId = splitInsert.rows[0].tracked_id;

        } else {
            // SZENARIO B: Vollständige Lieferung (Reines Update der bestehenden Zeile)
            await pool.query(
                'UPDATE tracked_products SET quantity = $1, expiry_date = $2, status = \'RECEIVED\' WHERE tracked_id = $3',
                [qty_received, expiry_date || null, tracked_id]
            );
        }

        // C4. Die Brücke in 'box_contents' schlagen (Verknüpfung Charge mit Behälter)
        if (finalBoxId) {
            await pool.query(
                'INSERT INTO box_contents (tenant_id, box_id, tracked_id, product_id) VALUES ($1, $2, $3, $4)',
                [tenant_id, finalBoxId, targetTrackedId, originalOrder.product_id]
            );
        }

        // C5. Eintrag in das unbestechliche historische Kassenbuch schreiben (Ledger)
        await pool.query(
            'INSERT INTO stock_transactions (tenant_id, product_id, box_id, transaction_type, quantity, price_gross) VALUES ($1, $2, $3, \'IN\', $4, $5)',
            [tenant_id, originalOrder.product_id, finalBoxId, qty_received, originalOrder.purchase_price_gross]
        );

        // Wenn alles fehlerfrei durchgelaufen ist, festschreiben!
        await pool.query('COMMIT');

        return res.json({ 
            success: true, 
            message: "Wareneingang kaufmännisch verbucht und Mengen-Splitting ausgeführt.",
            allocated_box: finalBoxId,
            received_units: qty_received
        });
        
        // Vorläufige Erfolgsmeldung für den ersten Test
        return res.json({ 
            success: true, 
            message: "Abschnitt A erfolgreich: Codes aufgelöst.",
            product_name: productMaster.name,
            max_order_qty: originalOrder.quantity
        });

    } catch (err) {
        console.error("[Inbound API Error]:", err.message);
        return res.status(500).json({ error: "ERR_SERVER_CRASH" });
    }
});

module.exports = router;
