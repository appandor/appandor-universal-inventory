TRUNCATE stock_transactions, boxes, tracked_products, product_master, product_categories, locations, users RESTART IDENTITY CASCADE;

-- 1. DIE SCHARFEN LOGINS REGISTRIEREN
INSERT INTO users (tenant_id, tenant_name, email, password_hash, role) VALUES 
(1, 'Appandorshop (Loft)', 'hugo@appandor.de', '$2b$10$BSTHCg4lbqFFG/voMeuSVexygAPBSncwwIYtsWaBgj28mvcuZlDem', 'ROLE_ADMIN'),    -- Passwort: loft  -- Sieht alles inklusive Einstellungen
(1, 'Appandorshop (Loft)', 'lars@appandor.de', '$2b$10$bwnEZ9j03L47Dp9IyuGR4etNrFxxNqPdaIrNURHdShbuebM8LUmEW', 'ROLE_WORKER');   -- Passwort: box  -- Sieht keine Einstellungen!

-- Restliche Struktur-Testdaten für Tenant 1 nachziehen
INSERT INTO product_categories (tenant_id, category_code, display_name) VALUES 
(1, 'TCG_DISPLAY', 'Trading Card Displays'),
(1, 'TCG_ACC', 'TCG Accessories');

INSERT INTO locations (tenant_id, site, zone, slot) VALUES 
(1, 'Loft Oberhausen', 'Shelf A', 'Row 1'),
(1, 'Loft Oberhausen', 'Shelf A', 'Row 2'),
(1, 'Loft Oberhausen', 'Investment Cabinet', 'Top Shelf');

INSERT INTO product_master (tenant_id, category_id, barcode, name, unit, minimum_stock, attributes) VALUES 
(1, 1, '4902370512345', 'One Piece OP-05 Booster Display', 'pcs', 5, '{"set_code": "OP-05"}'),
(1, 1, '4902370512399', 'Romance Dawn OP-01 Display', 'pcs', 2, '{"set_code": "OP-01"}'),
(1, 2, '4000123999999', 'Appandor Acrylic Magnetic Protection Case', 'pcs', 20, '{}');

INSERT INTO tracked_products (tenant_id, product_id, purchased_at, purchase_price_gross, estimated_delivery, expiry_date, quantity, status) VALUES 
(1, 1, '2026-05-10', 45.00, '2026-05-15', NULL, 2, 'RECEIVED'),
(1, 1, '2026-05-10', 45.00, '2026-05-15', NULL, 3, 'RECEIVED'),
(1, 2, '2026-06-01', 120.00, '2026-06-20', NULL, 4, 'ORDERED');

INSERT INTO boxes (box_id, tenant_id, tracked_id, location_id) VALUES 
('APP-BOX-001', 1, 1, 1),
('APP-BOX-002', 1, 2, 2),
('APP-CASE-999', 1, NULL, 3);

INSERT INTO stock_transactions (tenant_id, product_id, box_id, transaction_type, quantity, price_gross) VALUES 
(1, 1, 'APP-BOX-001', 'IN', 1, 45.00),
(1, 1, 'APP-BOX-002', 'IN', 1, 45.00);
