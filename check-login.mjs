import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT id, email, passwordHash, isActive, role, mustChangePassword FROM app_users');
for (const user of rows) {
  console.log('Email:', user.email);
  console.log('Active:', user.isActive);
  console.log('Role:', user.role);
  console.log('Hash:', user.passwordHash);
  const result = await bcrypt.compare('Purplepoptart7480!', user.passwordHash);
  console.log('Password "Purplepoptart7480!" valid:', result);
}
await conn.end();
