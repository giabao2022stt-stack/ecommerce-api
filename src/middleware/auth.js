const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return res.status(401).json({ message: 'Thiếu token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { uid, role }
    next();
  } catch {
    res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Không đủ quyền' });

module.exports = { authenticate, authorize };