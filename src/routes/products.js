const router = require('express').Router();
const prisma = require('../prisma');
const { authenticate, authorize } = require('../middleware/auth');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: 'id không hợp lệ' });
    return null;
  }
  return id;
}

function validate({ pname, price, quantity }) {
  if (typeof pname !== 'string' || !pname.trim() || pname.length > 100)
    return 'pname phải là chuỗi không rỗng, tối đa 100 ký tự';
  if (typeof price !== 'number' || price < 0) return 'price phải là số >= 0';
  if (!Number.isInteger(quantity) || quantity < 0) return 'quantity phải là số nguyên >= 0';
  return null;
}

// Ai cũng xem được
router.get('/', wrap(async (req, res) => {
  res.json(await prisma.product.findMany({ orderBy: { pid: 'asc' } }));
}));

router.get('/:id', wrap(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const p = await prisma.product.findUnique({ where: { pid: id } });
  if (!p) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
  res.json(p);
}));

// Chỉ ADMIN được thêm, sửa, xóa
router.post('/', authenticate, authorize('ADMIN'), wrap(async (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ message: err });
  const { pname, price, quantity } = req.body;
  res.status(201).json(await prisma.product.create({ data: { pname, price, quantity } }));
}));

router.put('/:id', authenticate, authorize('ADMIN'), wrap(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const err = validate(req.body);
  if (err) return res.status(400).json({ message: err });
  const { pname, price, quantity } = req.body;
  res.json(await prisma.product.update({ where: { pid: id }, data: { pname, price, quantity } }));
}));

router.delete('/:id', authenticate, authorize('ADMIN'), wrap(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  await prisma.product.delete({ where: { pid: id } });
  res.status(204).end();
}));

module.exports = router;
