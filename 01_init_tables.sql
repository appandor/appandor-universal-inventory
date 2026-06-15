-- =============================================================================
-- STEP 1: POSTGRESQL DATABASE SETUP (UNIVERSAL SAAS COMPREHENSIVE STRUCTURE)
-- =============================================================================
-- This script drops existing tables and initializes the core schema for the
-- universal inventory system (Product -> Purchase -> Box -> Location).
-- Multi-tenancy (tenant_id) is natively embedded into all core entities.
-- Includes advanced supply chain fields, retail links, and minimum stocks.
-- =============================================================================

-- CLEAN UP EXISTING TABLES (CASCADE ENSURES RELATIONSHIPS ARE DROPPED)
DROP TABLE IF EXISTS stock_transactions CASCADE;
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
-- TABLE 2: PRODUCT MASTER (The pure, universal product template with retail sync)
-- -----------------------------------------------------------------------------
CREATE TABLE product_master (
    product_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,                  -- Boundary for multi-tenancy isolation
    barcode VARCHAR(50),                     -- EAN / Manufacturer barcode
    name VARCHAR(255) NOT NULL,              -- e.g., 'One Piece OP-05 Display', 'Barilla No. 5'
    category VARCHAR(100) NOT NULL,          -- e.g., 'TCG', 'Wine', 'Groceries'
    unit VARCHAR(20) DEFAULT 'pcs',          -- Measurement unit: pcs, kg, l, g
    minimum_stock INT DEFAULT 0,             -- Alert trigger for low inventory
    shopify_product_id VARCHAR(100),         -- Optional: Direct link to Shopify store variant
    cardmarket_id VARCHAR(100),              -- Optional: Direct link to Cardmarket product
    attributes JSONB DEFAULT '{}',            -- Flexible attributes (NoSQL style key-value)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE 3: TRACKED PRODUCTS (Specific commercial purchases and open orders)
-- -----------------------------------------------------------------------------
CREATE TABLE tracked_products (
    tracked_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    product_id INT NOT NULL REFERENCES product_master(product_id) ON DELETE CASCADE,
    purchased_at DATE NOT NULL,               -- Order date at wholesaler
    purchase_price_gross NUMERIC(10, 2) NOT NULL, -- Historical gross buy price
    estimated_delivery DATE,                  -- Expected delivery date (Supply Chain tracking)
    expiry_date DATE,                        -- Optional: Best-before date for groceries / cans
    status VARCHAR(20) DEFAULT 'ORDERED',     -- 'ORDERED', 'RECEIVED', 'SOLD'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE 4: BOXES / CASES (The mobile containers with the unique barcode outside)
-- -----------------------------------------------------------------------------
CREATE TABLE boxes (
    box_id VARCHAR(50) PRIMARY KEY,          -- Unique custom ID (e.g., 'APP-00001', 'BOX-BLUE')
    tenant_id INT NOT NULL,
    tracked_id INT UNIQUE REFERENCES tracked_products(tracked_id) ON DELETE SET NULL, -- Current content
    location_id INT REFERENCES locations(location_id) ON DELETE SET NULL,           -- Current location
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE 5: STOCK TRANSACTIONS (The Ledger / Kassenbuch fuer Ein- und Verkaeufe)
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
-- PERFORMANCE INDEXES INCLUDING JSONB INVERTED INDEX FOR NOSQL SEARCH
-- -----------------------------------------------------------------------------
CREATE INDEX idx_products_barcode ON product_master(barcode);
CREATE INDEX idx_boxen_tenant ON boxes(tenant_id);
CREATE INDEX idx_transactions_tenant ON stock_transactions(tenant_id);
CREATE INDEX idx_products_attributes ON product_master USING gin(attributes); -- Fast search inside JSON

