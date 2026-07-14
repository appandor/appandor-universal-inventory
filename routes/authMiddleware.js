const jwt = require('jsonwebtoken');

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
        
        // KORREKTUR: Prüft das Token unbestechlich mit dem Docker-Schlüssel!
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.user = decoded; 
        next();
    } catch (err) {
        console.error("[Auth Middleware Token Error]:", err.message);
        return res.status(401).json({ error: "Invalid or expired session token." });
    }
}

module.exports = authenticateToken;