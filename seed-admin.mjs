/**
 * Seed script: creates the initial admin user in app_users table.
 * Run with: node seed-admin.mjs
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
const dotenv = require('dotenv');
dotenv.config({ path: join(__dirname, '.env') });

// Also try to load from process env (injected by platform)
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const EMAIL = 'cboudreau@teameip.com';
const NAME = 'cboudreau';
const PASSWORD = 'caboudr2';
const ROLE = 'admin';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const conn = await mysql.createConnection(dbUrl);

  // Check if user already exists
  const [existing] = await conn.execute(
    'SELECT id, email FROM app_users WHERE email = ?',
    [EMAIL]
  );

  if (existing.length > 0) {
    console.log(`User ${EMAIL} already exists (id=${existing[0].id}). Updating password and ensuring admin role...`);
    const hash = await bcrypt.hash(PASSWORD, 12);
    await conn.execute(
      'UPDATE app_users SET passwordHash = ?, role = ?, isActive = 1, mustChangePassword = 0 WHERE email = ?',
      [hash, ROLE, EMAIL]
    );
    console.log('Updated successfully.');
  } else {
    console.log(`Creating admin user: ${EMAIL}...`);
    const hash = await bcrypt.hash(PASSWORD, 12);
    await conn.execute(
      'INSERT INTO app_users (name, email, passwordHash, role, isActive, mustChangePassword) VALUES (?, ?, ?, ?, 1, 0)',
      [NAME, EMAIL, hash, ROLE]
    );
    console.log('Admin user created successfully.');
  }

  await conn.end();
  console.log('Done.');
}

main().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
