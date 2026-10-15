const router = require('express').Router();
const prisma = require('../prisma');
const { authenticate } = require('../middleware/auth');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const include = { details: true, shipments: true };

// body: { "items": [ { "pid": 1, "qty": 2 } ] }
router.post('/', authenticate, wrap(async (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: 'items không được rỗng' });
  if (items.some((i) => !Number.isInteger(i.pid) || !Number.isInteger(i.qty) || i.qty <= 0))
    return res.status(400).json({ message: 'Mỗi item cần pid và qty là số nguyên, qty > 0' });
  const pids = items.map((i) => i.pid);
  if (new Set(pids).size !== pids.length)
    return res.status(400).json({ message: 'Mỗi sản phẩm chỉ xuất hiện một lần' });

  const order = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({ where: { pid: { in: pids } } });
    if (products.length !== pids.length)
      throw Object.assign(new Error('Có sản phẩm không tồn tại'), { status: 400 });

    const created = await tx.order.create({ data: { uid: req.user.uid } });
    for (const it of items) {
      const p = products.find((x) => x.pid === it.pid);
      // Trừ kho có điều kiện: chỉ trừ khi còn đủ hàng
      const r = await tx.product.updateMany({
        where: { pid: it.pid, quantity: { gte: it.qty } },
        data: { quantity: { decrement: it.qty } },
      });
      if (r.count === 0)
        throw Object.assign(new Error(`Sản phẩm ${p.pname} không đủ hàng`), { status: 409 });
      await tx.orderDetail.create({
        data: { oid: created.oid, pid: it.pid, qty: it.qty, unit_price: p.price },
      });
    }
    await tx.shipment.create({ data: { oid: created.oid } });
    return tx.order.findUnique({ where: { oid: created.oid }, include });
  });
  res.status(201).json(order);
}));

// ADMIN xem tất cả, USER chỉ xem đơn của mình
router.get('/', authenticate, wrap(async (req, res) => {
  const where = req.user.role === 'ADMIN' ? {} : { uid: req.user.uid };
  res.json(await prisma.order.findMany({ where, include, orderBy: { oid: 'asc' } }));
}));

router.get('/:id', authenticate, wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ message: 'id không hợp lệ' });
  const o = await prisma.order.findUnique({ where: { oid: id }, include });
  if (!o || (req.user.role !== 'ADMIN' && o.uid !== req.user.uid))
    return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
  res.json(o);
}));

module.exports = router;
