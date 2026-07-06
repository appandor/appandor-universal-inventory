const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 443;
const JWT_SECRET = 'AppandorSecureCoreSecret2026!!!';

const pool = new Pool({
    user: 'appandor_admin',
    host: 'appandor_postgres',
    database: 'appandor_universal_inventory',
    password: 'EinSicheresDatenbankPasswort123!',
    port: 5432,
});

app.set('db_pool', pool);

const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/inventory.appandor.de/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/inventory.appandor.de/fullchain.pem')
};

app.use(express.json());
const publicPath = path.join(__dirname, 'web', 'public');
app.use(express.static(publicPath));

// =============================================================================
// ZENTRALE SUCHMASCHINEN-SPERRE: Blockiert Google & Co. für das gesamte System
// =============================================================================
app.use((req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
});

// =============================================================================
// SLIDING SESSION MIDDLEWARE (KORREKTUR: ROLLE UNVERLIERBAR MITGEBEN!)
// =============================================================================
app.use((req, res, next) => {
    if (req.url.startsWith('/api/') && !req.url.includes('/auth/login')) {
        try {
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const tokenArray = authHeader.split(' ');
                if (tokenArray.length === 2) {
                    const token = tokenArray[1]; 
                    const decoded = jwt.verify(token, JWT_SECRET);
                    
                    // SCHARFE KORREKTUR: Die Rolle wird ab jetzt IMMER atomsicher mitkopiert!
                    const renewedToken = jwt.sign(
                        { 
                            user_id: decoded.user_id, 
                            tenant_id: decoded.tenant_id, 
                            tenant_name: decoded.tenant_name, 
                            email: decoded.email,
                            role: decoded.role // <--- DAS REISSENDE RECHTE-KETTENGLIED IST GEFLICKT!
                        }, 
                        JWT_SECRET, 
                        { expiresIn: '1h' }
                    );
                    res.setHeader('X-Refresh-Token', renewedToken);
                }
            }
        } catch (err) {
            console.warn("[Sliding Session Refresh Warning]:", err.message);
        }
    }
    next();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/api/status', (req, res) => {
    res.json({ status: "alive", multi_tenancy: "ready", security: "https_secured" });
});

const authRouter = require('./routes/auth');
const inventoryRouter = require('./routes/inventory');
const productsRouter = require('./routes/products');
const inboundRouter = require('./routes/inbound');
const outboundRouter = require('./routes/outbound');

app.use('/api/auth', authRouter); 
app.use('/api/inventory', inventoryRouter);
app.use('/api/products', productsRouter);
app.use('/api/inbound', inboundRouter);
app.use('/api/outbound', outboundRouter);

app.get('/api/verify-session', (req, res) => {
    res.redirect(307, '/api/auth/verify-session');
});

https.createServer(options, app).listen(PORT, () => {
    console.log(`[Appandor Core] Secure HTTPS running live on port 443`);
});
