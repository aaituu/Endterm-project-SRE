/**
 * seed.js — Run after database.sql to set up the admin password correctly
 * Usage: node seed.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'school_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seed() {
  try {
    console.log('\n Connecting to database...');
    await pool.query('SELECT 1');
    console.log(' Connected.');

    // Hash the admin password
    const password = 'Admin123!';
    const hash = await bcrypt.hash(password, 10);

    // Check if global admin exists
    const superRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'super_admin'");
    if (!superRoleRes.rows.length) {
      console.error(' Error: super_admin role not found. Run database.sql first.');
      process.exit(1);
    }

    const existing = await pool.query("SELECT id FROM users WHERE iin = '000000000001'");
    if (existing.rows.length > 0) {
      // Update the password to ensure it's correct
      await pool.query(
        "UPDATE users SET password_hash = $1, role_id = $2, school_id = 1, teacher_id = NULL, is_active = TRUE WHERE iin = '000000000001'",
        [hash, superRoleRes.rows[0].id]
      );
      console.log(' Global admin password and role updated.');
    } else {
      await pool.query(
        'INSERT INTO users (full_name, iin, password_hash, role_id) VALUES ($1, $2, $3, $4)',
        ['Global Super Admin', '000000000001', hash, superRoleRes.rows[0].id]
      );
      console.log(' Global admin user created.');
    }

    console.log('\n Global admin credentials:');
    console.log('  super_admin: IIN=000000000001, Password=Admin123!');
    console.log('  School admins are created inside each tenant database when a school is provisioned.');

    console.log('\n Done!\n');
    process.exit(0);
  } catch (err) {
    console.error(' Seed error:', err.message);
    process.exit(1);
  }
}

seed();
