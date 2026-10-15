const router = require('express').Router();
const prisma = require('../prisma');
const { authenticate, authorize } = require('../middleware/auth');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const STATUSES = ['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Chỉ ADMIN tạo shipment cho một đơn hàng
router.post('/', authenticate, authorize('ADMIN'), wrap(async (req, res) => {
  const oid = parseId(req.body.oid);
  const status = req.body.status ?? 'PENDING';
  if (oid === null) return res.status(400).json({ message: 'oid không hợp lệ' });
  if (!STATUSES.includes(status))
    return res.status(400).json({ message: `status phải là một trong: ${STATUSES.join(', ')}` });

  const order = await prisma.order.findUnique({ where: { oid } });
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

  res.status(201).json(await prisma.shipment.create({ data: { oid, status } }));
}));

// Chỉ ADMIN cập nhật trạng thái
router.patch('/:id', authenticate, authorize('ADMIN'), wrap(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ message: 'id không hợp lệ' });
  const { status } = req.body;
  if (!STATUSES.includes(status))
    return res.status(400).json({ message: `status phải là một trong: ${STATUSES.join(', ')}` });

  res.json(await prisma.shipment.update({ where: { shipid: id }, data: { status } }));
}));

// ADMIN xem mọi shipment, USER chỉ xem shipment thuộc đơn của mình
router.get('/:id', authenticate, wrap(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ message: 'id không hợp lệ' });

  const s = await prisma.shipment.findUnique({ where: { shipid: id }, include: { order: true } });
  if (!s || (req.user.role !== 'ADMIN' && s.order.uid !== req.user.uid))
    return res.status(404).json({ message: 'Không tìm thấy shipment' });

  const { order, ...shipment } = s;
  res.json(shipment);
}));

module.exports = router;
