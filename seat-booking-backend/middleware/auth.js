export function adminAuth(req, res, next) {
    const token = req.headers['authorization'];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Simple token validation (in production, use proper JWT validation)
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [username] = decoded.split(':');
      
      if (username === 'admin') {
        req.admin = { username };
        next();
      } else {
        res.status(401).json({ error: 'Invalid token' });
      }
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }