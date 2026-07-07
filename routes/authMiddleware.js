const jwt = require('jsonwebtoken');
const JWT_SECRET = 'AppandorSecureCoreSecret2026!!!';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Access denied. Token missing." });
    }

    const tokenArray = authHeader.split(' ');
    if (tokenArray.length !== 2) {
        return res.status(401).json({ error: "Access denied. Malformed token." });
    }

    try {
        const token = tokenArray[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Wir hängen die decodierten User-Daten direkt an das Request-Objekt an!
        // Ab jetzt kann jede Route im System über 'req.user.tenant_id' darauf zugreifen.
        req.user = decoded; 
        next(); // Wächter passiert -> Weiter zur eigentlichen Route
    } catch (err) {
        console.error("[Auth Middleware Token Error]:", err.message);
        return res.status(401).json({ error: "Invalid or expired session token." });
    }
}

module.exports = authenticateToken;
