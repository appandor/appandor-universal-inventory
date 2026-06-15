-- =============================================================================
-- STEP 1: POSTGRESQL DATABASE SETUP (UNIVERSAL SAAS STRUCTURE)
-- =============================================================================
-- This script drops existing tables and initializes the core schema for the
-- universal inventory system (Product -> Purchase -> Box -> Location).
-- Multi-tenancy (tenant_id) is natively embedded into all core entities.
-- =============================================================================

-- CLEAN UP EXISTING TABLES (CASCADE ENSURES RELATIONSHIPS ARE DROPPED)
DROP TABLE IF EXISTS stock_transactions CASCADE;
DROP TABLE IF EXISTS product_attributes CASCADE;
DROP TABLE IF EXISTS boxes CASCADE;
DROP TABLE IF EXISTS tracked_products CASCADE;
DROP TABLE IF EXISTS product_master CASCADE;
DROP TABLE IF EXISTS locations CASCADE;

-- -----------------------------------------------------------------------------
-- TABLE 1: LOCATIONS (The physical world in the loft / basement / warehouse)
-- -----------------------------------------------------------------------------
CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,                  -- Boundary for multi-tenancy isolation
    site VARCHAR(100) NOT NULL,              -- e.g., 'Loft Oberhausen', 'Basement Scheuerstr'
    zone VARCHAR(100) NOT NULL,              -- e.g., 'Shelf A', 'Investment Cabinet', 'Kitchen'
    slot VARCHAR(100) NOT NULL,              -- e.g., 'Top Tier', 'Row 3', 'Drawer 2'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE 2: PRODUCT MASTER (The pure, universal product template)
-- -----------------------------------------------------------------------------
CREATE TABLE product_master (
    product_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,                  -- Boundary for multi-tenancy isolation
    barcode VARCHAR(50),                     -- EAN / Manufacturer barcode
    name VARCHAR(255) NOT NULL,              -- e.g., 'One Piece OP-05 Display', 'Barilla No. 5'
    category VARCHAR(100) NOT NULL,          -- e.g., 'TCG', 'Wine', 'Groceries'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE 3: PRODUCT ATTRIBUTES (The dynamic Key-Value Secret Weapon)
-- -----------------------------------------------------------------------------
CREATE TABLE product_attributes (
    attribute_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    product_id INT NOT NULL REFERENCES product_master(product_id) ON DELETE CASCADE,
    attribute_key VARCHAR(100) NOT NULL,     -- e.g., 'set_code', 'language', 'weight', 'dimensions'
    attribute_value VARCHAR(255) NOT NULL,   -- e.g., 'OP-05', 'English', '500g', '61x91cm'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE 4: TRACKED PRODUCTS (Specific commercial purchases with historical values)
-- -----------------------------------------------------------------------------
CREATE TABLE tracked_products (
    tracked_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    product_id INT NOT NULL REFERENCES product_master(product_id) ON DELETE CASCADE,
    purchased_at DATE NOT NULL,               -- Exact date of purchase (2026 vs. 2027 logic)
    purchase_price_gross NUMERIC(10, 2) NOT NULL, -- Historical gross buy price
    expiry_date DATE,                        -- Optional: Best-before date for groceries / cans
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE 5: BOXES / CASES (The mobile containers with the unique barcode outside)
-- -----------------------------------------------------------------------------
CREATE TABLE boxes (
    box_id VARCHAR(50) PRIMARY KEY,          -- Unique custom ID (e.g., 'APP-00001', 'BOX-BLUE')
    tenant_id INT NOT NULL,
    tracked_id INT UNIQUE REFERENCES tracked_products(tracked_id) ON DELETE SET NULL, -- Current content
    location_id INT REFERENCES locations(location_id) ON DELETE SET NULL,           -- Current location
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE 6: STOCK TRANSACTIONS (The Ledger / Kassenbuch fuer Ein- und Verkaeufe)
-- -----------------------------------------------------------------------------
CREATE TABLE stock_transactions (
    transaction_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    product_id INT NOT NULL REFERENCES product_master(product_id) ON DELETE CASCADE,
    box_id VARCHAR(50),                      -- Which box container was moved/sold
    transaction_type VARCHAR(10) NOT NULL,   -- 'IN' (Einkauf) oder 'OUT' (Verkauf/Verbrauch)
    quantity INT NOT NULL,                   -- Menge (z.B. 1 oder 5)
    price_gross NUMERIC(10, 2) NOT NULL,     -- Der jeweilige EK oder VK Brutto
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- PERFORMANCE INDEXES FOR FAST SMARTPHONE SCANNING
-- -----------------------------------------------------------------------------
CREATE INDEX idx_products_barcode ON product_master(barcode);
CREATE INDEX idx_boxen_tenant ON boxes(tenant_id);
CREATE INDEX idx_transactions_tenant ON stock_transactions(tenant_id);
CREATE INDEX idx_attributes_product ON product_attributes(product_id);
