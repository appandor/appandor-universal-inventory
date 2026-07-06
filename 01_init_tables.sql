-- =============================================================================
-- STEP 1: POSTGRESQL DATABASE SETUP (UNIVERSAL SAAS COMPREHENSIVE STRUCTURE)
-- =============================================================================

DROP TABLE IF EXISTS stock_transactions CASCADE;
DROP TABLE IF EXISTS boxes CASCADE;
DROP TABLE IF EXISTS tracked_products CASCADE;
DROP TABLE IF EXISTS product_master CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS users CASCADE; -- NEU: Tabelle für das Sitzungssystem

-- -----------------------------------------------------------------------------
-- TABLE 00: USERS (Die unbestechliche Rechteschranke pro Workspace)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,                  -- Welchem Händler gehört der Nutzer
    tenant_name VARCHAR(100) NOT NULL,       -- Anzeigename des Workspaces (z.B. Loft Oberhausen)
    email VARCHAR(150) NOT NULL UNIQUE,      -- Login-E-Mail
    password_hash VARCHAR(255) NOT NULL,     -- Klartext-Passwörter sind verboten!
    role VARCHAR(20) NOT NULL DEFAULT 'ROLE_WORKER', -- ROLE_ADMIN, ROLE_WORKER, ROLE_SUPERADMIN
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- CORE TABLE COUPLINGS
-- -----------------------------------------------------------------------------
CREATE TABLE product_categories (
    category_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    category_code VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, category_code)
);

CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    site VARCHAR(100) NOT NULL,
    zone VARCHAR(100) NOT NULL,
    slot VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE tracked_products (
    tracked_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    product_id INT NOT NULL REFERENCES product_master(product_id) ON DELETE CASCADE,
    purchased_at DATE NOT NULL,
    purchase_price_gross NUMERIC(10, 2) NOT NULL,
    estimated_delivery DATE,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'ORDERED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE boxes (
    box_id VARCHAR(50) PRIMARY KEY,
    tenant_id INT NOT NULL,
    tracked_id INT UNIQUE REFERENCES tracked_products(tracked_id) ON DELETE SET NULL,
    location_id INT REFERENCES locations(location_id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_transactions (
    transaction_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    product_id INT NOT NULL REFERENCES product_master(product_id) ON DELETE CASCADE,
    box_id VARCHAR(50),
    transaction_type VARCHAR(10) NOT NULL,
    quantity INT NOT NULL,
    price_gross NUMERIC(10, 2) NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_barcode ON product_master(barcode);
CREATE INDEX idx_boxen_tenant ON boxes(tenant_id);
CREATE INDEX idx_transactions_tenant ON stock_transactions(tenant_id);
CREATE INDEX idx_products_attributes ON product_master USING gin(attributes);
CREATE INDEX idx_categories_tenant ON product_categories(tenant_id);
CREATE INDEX idx_users_email ON users(email);
