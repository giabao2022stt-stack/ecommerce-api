const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.role.upsert({
    where: { rolename: 'ADMIN' }, update: {}, create: { rolename: 'ADMIN' },
  });
  await prisma.role.upsert({
    where: { rolename: 'normal' }, update: {}, create: { rolename: 'normal' },
  });

  let normalMember = await prisma.membership.findFirst({ where: { mname: 'normal' } });
  if (!normalMember) normalMember = await prisma.membership.create({ data: { mname: 'normal', score: 10 } });

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin', fullname: 'Administrator',
      password: await bcrypt.hash('Admin@123', 10),
      roleid: admin.roleid, mid: normalMember.mid,
    },
  });
  console.log('Seed xong');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); process.exit(1); });