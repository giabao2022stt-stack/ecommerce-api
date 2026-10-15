require('dotenv').config();
const express = require('express');
const prisma = require('./prisma');

const app = express();
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'up', uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: 'error', db: 'down' });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
// Các route sau sẽ thêm ở 6.3, 6.4:
app.use('/api/orders', require('./routes/orders'));
app.use('/api/shipments', require('./routes/shipments'));

app.use((req, res) => res.status(404).json({ message: 'Không tìm thấy' }));
app.use((err, req, res, next) => {
  if (err.code === 'P2025') return res.status(404).json({ message: 'Không tìm thấy bản ghi' });
  if (err.code === 'P2003') return res.status(409).json({ message: 'Bản ghi đang được tham chiếu, không thể xóa' });
  if (err.code === 'P2002') return res.status(409).json({ message: 'Dữ liệu bị trùng' });
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Lỗi máy chủ' });
});

module.exports = app;
