const jwt = require('jsonwebtoken');

/**
 * auth(roles?)
 * roles: array of allowed roles, e.g. ['superadmin', 'admin']
 * empty array = any authenticated user
 */
module.exports = (roles = []) => (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'Нет токена' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, displayName }

    if (roles.length && !roles.includes(decoded.role))
      return res.status(403).json({ message: 'Нет прав доступа' });

    next();
  } catch {
    res.status(401).json({ message: 'Неверный или истёкший токен' });
  }
};
