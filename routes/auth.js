const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'AppandorSecureCoreSecret2026!!!';

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

        const user = result.rows[0];

        if (password !== user.password_hash) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { 
                user_id: user.user_id, 
                tenant_id: user.tenant_id, 
                tenant_name: user.tenant_name,
                email: user.email, // E-Mail fest im Ticket verschweißen
                role: user.role 
            }, 
            JWT_SECRET, 
            { expiresIn: '1h' }
        );

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

// 2. API: SCHARFER SESSION-VERIFY (Erweitert um E-Mail Durchreichung)
router.get('/verify-session', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Access denied." });
    }

    const tokenArray = authHeader.split(' ');
    if (tokenArray.length !== 2) return res.status(401).json({ error: "Invalid token" });

    try {
        const decoded = jwt.verify(tokenArray[1], JWT_SECRET);
        
        // SCHARFE ERWEITERUNG: E-Mail fließt zurück zum Frontend
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
