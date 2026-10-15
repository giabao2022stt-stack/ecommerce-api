const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const sign = (user) =>
  jwt.sign({ uid: user.uid, role: user.role.rolename }, process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

router.post('/register', wrap(async (req, res) => {
  const { username, fullname, password } = req.body;
  if (!username || !fullname || !password || password.length < 6)
    return res.status(400).json({ message: 'username, fullname, password (>=6 ký tự) là bắt buộc' });

  if (await prisma.user.findUnique({ where: { username } }))
    return res.status(409).json({ message: 'Username đã tồn tại' });

  const role = await prisma.role.findUnique({ where: { rolename: 'normal' } });
  const membership = await prisma.membership.findFirst({ where: { mname: 'normal' } });

  const user = await prisma.user.create({
    data: { username, fullname, password: await bcrypt.hash(password, 10),
            roleid: role.roleid, mid: membership.mid },
    select: { uid: true, username: true, fullname: true, role: true, membership: true },
  });
  res.status(201).json(user);
}));

router.post('/login', wrap(async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username: username || '' }, include: { role: true } });
  if (!user || !(await bcrypt.compare(password || '', user.password)))
    return res.status(401).json({ message: 'Sai username hoặc password' });
  res.json({ token: sign(user) });
}));

module.exports = router;