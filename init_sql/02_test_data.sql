-- =============================================================================
-- STEP 2: APPANDOR LOGISTICS SYSTEM TEST DATA SEEDING (2026)
-- =============================================================================
-- Fully loaded logistics state: Mixed ORDERED and RECEIVED assets.
-- =============================================================================

-- 1. DIE SCHARFEN LOGINS REGISTRIEREN
INSERT INTO users (tenant_id, tenant_name, email, password_hash, role) VALUES 
(1, 'Appandorshop (Loft)', 'hugo@appandor.de', '$2b$10$BSTHCg4lbqFFG/voMeuSVexygAPBSncwwIYtsWaBgj28mvcuZlDem', 'ROLE_ADMIN'),    -- Passwort: loft
(1, 'Appandorshop (Loft)', 'lars@appandor.de', '$2b$10$bwnEZ9j03L47Dp9IyuGR4etNrFxxNqPdaIrNURHdShbuebM8LUmEW', 'ROLE_WORKER')   -- Passwort: box
ON CONFLICT (email) DO NOTHING;

-- 2. KATEGORIEN ANLEGEN
INSERT INTO product_categories (tenant_id, category_code, display_name) VALUES
(1, 'GROCERY', 'Lebensmittel und Konserven'),
(1, 'TCG', 'Trading Card Games')
ON CONFLICT DO NOTHING;

-- 3. LAGERPLÄTZE (REGALBRETTER) MIT SCAN-CODES UND KLIMA-TYPEN
INSERT INTO locations (tenant_id, location_code, site, zone, slot, max_volume_capacity, environment_type, is_locked) VALUES
(1, 'LOC-OB-REGAL-A1', 'Loft Oberhausen', 'Regal A', 'Reihe 1 / Oben', 100, 'AMBIENT', FALSE),
(1, 'LOC-OB-REGAL-A2', 'Loft Oberhausen', 'Regal A', 'Reihe 2 / Mitte', 100, 'AMBIENT', FALSE),
(1, 'LOC-OB-KELLER-K1', 'Kellerlager', 'Kühlregal', 'Fach 1', 100, 'COLD', FALSE)
ON CONFLICT DO NOTHING;

-- 4. PRODUKT-STAMMDATEN (MASTER)
INSERT INTO product_master (tenant_id, category_id, barcode, name, unit, minimum_stock, attributes) VALUES
(1, (SELECT category_id FROM product_categories WHERE category_code = 'GROCERY' AND tenant_id = 1 LIMIT 1), 
 '4000123456789', 'Linsensuppe Deftig 800g', 'pcs', 10, 
 '{"volume_share_per_unit": 5, "max_qty_in_physical_box": 20, "requires_airtight": false, "requires_opaque": false}'),

(1, (SELECT category_id FROM product_categories WHERE category_code = 'TCG' AND tenant_id = 1 LIMIT 1), 
 '0815000999999', 'One Piece OP-05 Display (Englisch)', 'pcs', 5, 
 '{"volume_share_per_unit": 10, "max_qty_in_physical_box": 5, "requires_airtight": true, "requires_opaque": true}')
ON CONFLICT DO NOTHING;

-- 5. BESTÄNDE & BESTELLUNGEN (TRACKED PRODUCTS)
-- Hier erzeugen wir jetzt die perfekte, kaufmännische Aufteilung
INSERT INTO tracked_products (tenant_id, product_id, purchased_at, purchase_price_gross, estimated_delivery, expiry_date, quantity, status) VALUES
-- Charge A: 3x Linsensuppe (Noch OFFEN beim Großhändler)
(1, (SELECT product_id FROM product_master WHERE barcode = '4000123456789' AND tenant_id = 1 LIMIT 1), 
 CURRENT_DATE - INTERVAL '2 days', 1.49, CURRENT_DATE + INTERVAL '1 day', NULL, 3, 'ORDERED'),

-- Charge B: 2x Linsensuppe (Bereits PHYSISCH IM LAGER mit MHD 2028)
(1, (SELECT product_id FROM product_master WHERE barcode = '4000123456789' AND tenant_id = 1 LIMIT 1), 
 CURRENT_DATE - INTERVAL '10 days', 1.39, NULL, '2028-12-31', 2, 'RECEIVED'),

-- Charge C: 2x One Piece Displays (Noch OFFEN beim Großhändler)
(1, (SELECT product_id FROM product_master WHERE barcode = '0815000999999' AND tenant_id = 1 LIMIT 1), 
 CURRENT_DATE - INTERVAL '5 days', 89.90, CURRENT_DATE, NULL, 2, 'ORDERED'),

-- Charge D: 1x One Piece Display (Bereits PHYSISCH IM LAGER)
(1, (SELECT product_id FROM product_master WHERE barcode = '0815000999999' AND tenant_id = 1 LIMIT 1), 
 CURRENT_DATE - INTERVAL '12 days', 85.00, NULL, NULL, 1, 'RECEIVED')
ON CONFLICT DO NOTHING;

-- 6. PHYSISCHE TEST-BOXEN ANLEGEN
INSERT INTO boxes (box_id, tenant_id, location_id, is_virtual, is_airtight, is_opaque, allowed_environment) VALUES
('APP-BOX-001', 1, (SELECT location_id FROM locations WHERE location_code = 'LOC-OB-REGAL-A1' AND tenant_id = 1 LIMIT 1), FALSE, FALSE, FALSE, 'AMBIENT'),
('APP-BOX-002', 1, (SELECT location_id FROM locations WHERE location_code = 'LOC-OB-REGAL-A2' AND tenant_id = 1 LIMIT 1), FALSE, TRUE, TRUE, 'AMBIENT')
ON CONFLICT DO NOTHING;

-- 7. N:M BRÜCKE IN DER ZWISCHENTABELLE (BOX CONTENTS) SCHLIESSEN
-- Jetzt binden wir die gelagertenRECEIVED-Chargen fest an die Kisten!
INSERT INTO box_contents (tenant_id, box_id, tracked_id, product_id) VALUES
-- Die 2 Dosen Linsensuppe (Charge B) liegen fest in der APP-BOX-001
(1, 'APP-BOX-001', (SELECT tracked_id FROM tracked_products WHERE status = 'RECEIVED' AND product_id = (SELECT product_id FROM product_master WHERE barcode = '4000123456789' LIMIT 1) LIMIT 1), (SELECT product_id FROM product_master WHERE barcode = '4000123456789' LIMIT 1)),

-- Das 1 blickdichte One Piece Display (Charge D) liegt fest in der APP-BOX-002
(1, 'APP-BOX-002', (SELECT tracked_id FROM tracked_products WHERE status = 'RECEIVED' AND product_id = (SELECT product_id FROM product_master WHERE barcode = '0815000999999' LIMIT 1) LIMIT 1), (SELECT product_id FROM product_master WHERE barcode = '0815000999999' LIMIT 1))
ON CONFLICT DO NOTHING;
