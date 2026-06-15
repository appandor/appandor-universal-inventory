const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 80;

// Middleware to parse JSON bodies in API requests
app.use(express.json());

// DATABASE CONNECTION (PostgreSQL inside Docker)
const pool = new Pool({
  user: 'appandor_admin',
  host: 'postgres-db', // Matches the docker-compose service name
  database: 'appandor_universal_inventory',
  password: 'EinSicheresDatenbankPasswort123!',
  port: 5432,
});

// FAKE-AUTH MIDDLEWARE (DEVELOPMENT PHASE)
// Automatically injects User 1 and Tenant (Circle) 1 into every request
app.use((req, res, next) => {
  req.user = { id: 1, name: 'Andreas', role: 'Admin' };
  req.tenant = { id: 1, name: 'Appandor Circle 1' };
  next();
});

// SYSTEM STATUS ROUTE (Health Check)
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    message: 'Universal Inventory Backend running smoothly!',
    authenticated_user: req.user.name,
    circle_id: req.tenant.id
  });
});

// API ROUTE 1: GET ALL PRODUCT MASTER TEMPLATES (Filtered by Circle)
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM product_master WHERE tenant_id = $1 ORDER BY name ASC',
      [req.tenant.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error while fetching products' });
  }
});

// API ROUTE 2: CREATE NEW PRODUCT MASTER TEMPLATE
app.post('/api/products', async (req, res) => {
  const { name, barcode, category } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required fields' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO product_master (tenant_id, name, barcode, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.tenant.id, name, barcode, category]
    );
    res.status(201).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error while creating product' });
  }
});

// API ROUTE 3: UPDATE EXISTING PRODUCT MASTER TEMPLATE (PUT)
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, barcode, category } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required fields' });
  }
  try {
    // We strictly check the tenant_id so users can only update their own circle's products
    const result = await pool.query(
      'UPDATE product_master SET name = $1, barcode = $2, category = $3 WHERE product_id = $4 AND tenant_id = $5 RETURNING *',
      [name, barcode, category, id, req.tenant.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error while updating product' });
  }
});

// API ROUTE 4: DELETE PRODUCT MASTER TEMPLATE (DELETE)
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Strictly verify tenant boundaries before dropping data
    const result = await pool.query(
      'DELETE FROM product_master WHERE product_id = $1 AND tenant_id = $2 RETURNING *',
      [id, req.tenant.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }
    res.json({ message: 'Product deleted successfully', deleted_product: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error while deleting product' });
  }
});

// START SERVER
app.listen(port, () => {
  console.log(`====================================================`);
  console.log(` Appandor Universal Backend active on port ${port} `);
  console.log(` Mode: Fake-Auth (User 1 / Tenant 1 active)        `);
  console.log(`====================================================`);
});
