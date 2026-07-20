const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Berechnet die Ablaufzeit ein einziges Mal!
const JWT_EXPIRATION_SECONDS = process.env.JWT_EXPIRES_IN ? Number(process.env.JWT_EXPIRES_IN) : 7200;

// 1. API: SCHARFES LOGIN
router.post('/login', async (req, res) => {
    const pool = req.app.get('db_pool');
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const query = `SELECT user_id, tenant_id, tenant_name, email, password_hash, role FROM users WHERE email = $1;`;
        const result = await pool.query(query, [email.trim().toLowerCase()]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // KORREKTUR: Das ERSTE Element [0] aus den Datenbank-Zeilen ziehen!
        const user = result.rows[0];

        // KORREKTUR: Sicherer Bcrypt-Vergleich auf das exakte Datenbank-Objekt!
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: "Invalid credentials" });
        }


        const token = jwt.sign(
            { 
                user_id: user.user_id, 
                tenant_id: user.tenant_id, 
                tenant_name: user.tenant_name,
                email: user.email, 
                role: user.role 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: JWT_EXPIRATION_SECONDS } 
        );

       // ZUSATZ FÜR UHRZEIT-CHECK (CRLF)
        const checkDecoded = jwt.decode(token);
        console.log("--- TIMESTAMP COMPARISON ---");
        console.log("Issued at (iat):", checkDecoded.iat);
        console.log("Expires at (exp):", checkDecoded.exp);
        console.log("Difference in backend:", checkDecoded.exp - checkDecoded.iat);

        res.json({ 
            message: "Authentication successful", 
            token: token,
            role: user.role,
            tenant_name: user.tenant_name
        });

    } catch (err) {
        console.error("[API Auth Login Error]:", err.message);
        res.status(500).json({ error: "Internal authentication server failure" });
    }
});

// 2. API: SCHARFER SESSION-VERIFY WITH SLIDING REFRESH (CRLF)
router.get('/verify-session', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Access denied." });
    }

    const tokenArray = authHeader.split(' ');
    if (tokenArray.length !== 2) return res.status(401).json({ error: "Invalid token" });

    try {
        // Verifiziert das Token synchron mit dem Docker-Key
        const decoded = jwt.verify(tokenArray[1], process.env.JWT_SECRET);
        
        // SCHARFE SLIDING REFRESH KORREKTUR: Zieht die 1800 Sekunden aus Docker!
        const renewedToken = jwt.sign(
            { 
                user_id: decoded.user_id, 
                tenant_id: decoded.tenant_id, 
                tenant_name: decoded.tenant_name, 
                email: decoded.email,
                role: decoded.role 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: JWT_EXPIRATION_SECONDS }
        );
        
        // Der Header reist ab jetzt kontrolliert und nur über diese Route zum Client!
        res.setHeader('X-Refresh-Token', renewedToken);
        
        res.json({ 
            tenant_name: decoded.tenant_name, 
            role: decoded.role,
            email: decoded.email, 
            is_sandbox: false 
        });

    } catch (err) {
        res.status(401).json({ error: "Session expired." });
    }
});

module.exports = router;
