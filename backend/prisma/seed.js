const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with initial data via Prisma...');

  const count = await prisma.user.count();
  if (count > 0) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  const adminHash = bcrypt.hashSync('admin123', 10);
  const userHash = bcrypt.hashSync('user123', 10);

  const admin = await prisma.user.create({
    data: { name: 'Admin User', email: 'admin@example.com', password: adminHash, role: 'admin', department: 'Management' }
  });

  const u1 = await prisma.user.create({
    data: { name: 'John Doe', email: 'john@example.com', password: userHash, role: 'student', department: 'Engineering' }
  });

  const u2 = await prisma.user.create({
    data: { name: 'Jane Smith', email: 'jane@example.com', password: userHash, role: 'student', department: 'Design' }
  });

  const u3 = await prisma.user.create({
    data: { name: 'Robert Johnson', email: 'robert@example.com', password: userHash, role: 'employee', department: 'HR' }
  });

  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    await prisma.attendance.create({ data: { userId: u1.id, date: dateStr, status: i % 2 === 0 ? 'present' : 'absent', notes: '' } });
    await prisma.attendance.create({ data: { userId: u2.id, date: dateStr, status: 'present', notes: 'On time' } });
    await prisma.attendance.create({ data: { userId: u3.id, date: dateStr, status: i === 1 ? 'late' : 'present', notes: i === 1 ? 'Traffic' : '' } });
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
