-- =============================================================================
-- STEP 1: POSTGRESQL DATABASE SETUP (UNIVERSAL SAAS LOGISTICS ENGINE)
-- =============================================================================
-- Fully fixed dependency chain order (Categories -> Locations -> Master -> Tracked -> Boxes -> Contents -> Trans)
-- =============================================================================

DROP TABLE IF EXISTS stock_transactions CASCADE;
DROP TABLE IF EXISTS box_contents CASCADE;
DROP TABLE IF EXISTS boxes CASCADE;
DROP TABLE IF EXISTS tracked_products CASCADE;
DROP TABLE IF EXISTS users CASCADE; 
DROP TABLE IF EXISTS product_master CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS locations CASCADE;


-- -----------------------------------------------------------------------------
-- TABLE -1: USERS (Die unbestechliche Benutzer- und Mandantenverwaltung)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    tenant_name VARCHAR(150) NOT NULL,       -- KORREKTUR: Für die Anzeige im App-Header!
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'ROLE_WORKER',  -- KORREKTUR: Standard-Rolle für Mitarbeiter
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE 0: PRODUCT CATEGORIES (Muss als ALLERERSTES erstellt werden!)
-- -----------------------------------------------------------------------------
CREATE TABLE product_categories (
    category_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    category_code VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, category_code)
);

-- -----------------------------------------------------------------------------
-- TABLE 1: LOCATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    location_code VARCHAR(100) NOT NULL,
    site VARCHAR(100) NOT NULL,
    zone VARCHAR(100) NOT NULL,
    slot VARCHAR(100) NOT NULL,
    max_volume_capacity INT DEFAULT 100,
    environment_type VARCHAR(50) DEFAULT 'AMBIENT',
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, location_code)
);

-- -----------------------------------------------------------------------------
-- TABLE 2: PRODUCT MASTER (Referenziert jetzt sauber Table 0)
-- -----------------------------------------------------------------------------
CREATE TABLE product_master (
    product_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    category_id INT REFERENCES product_categories(category_id) ON DELETE SET NULL,
    barcode VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(20) DEFAULT 'pcs',
    minimum_stock INT DEFAULT 0,
    shopify_product_id VARCHAR(100),
    cardmarket_id VARCHAR(100),
    attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE 3: TRACKED PRODUCTS (Referenziert sauber Table 2)
-- -----------------------------------------------------------------------------
CREATE TABLE tracked_products (
    tracked_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    product_id INT NOT NULL REFERENCES product_master(product_id) ON DELETE CASCADE,
    purchased_at DATE NOT NULL,
    purchase_price_gross NUMERIC(10, 2) NOT NULL,
    estimated_delivery DATE,
    expiry_date DATE,
    quantity INT NOT NULL DEFAULT 1,
    status VARCHAR(20) DEFAULT 'ORDERED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE 4: BOXES / CASES (Referenziert sauber Table 1)
-- -----------------------------------------------------------------------------
CREATE TABLE boxes (
    box_id VARCHAR(50) PRIMARY KEY,
    tenant_id INT NOT NULL,
    location_id INT REFERENCES locations(location_id) ON DELETE SET NULL,
    is_virtual BOOLEAN DEFAULT FALSE,
    is_airtight BOOLEAN DEFAULT FALSE,
    is_opaque BOOLEAN DEFAULT FALSE,
    allowed_environment VARCHAR(50) DEFAULT 'AMBIENT',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE 4B: BOX CONTENTS (Referenziert sauber Table 4, Table 3 und Table 2)
-- -----------------------------------------------------------------------------
CREATE TABLE box_contents (
    content_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    box_id VARCHAR(50) NOT NULL REFERENCES boxes(box_id) ON DELETE CASCADE,
    tracked_id INT NOT NULL REFERENCES tracked_products(tracked_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES product_master(product_id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (box_id, tracked_id)
);

-- -----------------------------------------------------------------------------
-- TABLE 5: STOCK TRANSACTIONS
-- -----------------------------------------------------------------------------
CREATE TABLE stock_transactions (
    transaction_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    product_id INT NOT NULL REFERENCES product_master(product_id) ON DELETE CASCADE,
    box_id VARCHAR(50),
    transaction_type VARCHAR(10) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price_gross NUMERIC(10, 2) NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- PERFORMANCE AND INTEGRITY INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX idx_products_barcode ON product_master(barcode);
CREATE INDEX idx_boxen_tenant ON boxes(tenant_id);
CREATE INDEX idx_box_contents_lookup ON box_contents(box_id, product_id);
CREATE INDEX idx_transactions_tenant ON stock_transactions(tenant_id);
CREATE INDEX idx_products_attributes ON product_master USING gin(attributes);
CREATE INDEX idx_categories_tenant ON product_categories(tenant_id);
CREATE INDEX idx_locations_lock ON locations(tenant_id, is_locked);
