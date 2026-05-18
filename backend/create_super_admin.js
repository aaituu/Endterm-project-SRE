require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'school_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function run() {
  try {
    const iin = '000000000001';
    const password = 'Admin123!';
    const hash = await bcrypt.hash(password, 10);
    const superAdminRole = await pool.query("SELECT id FROM roles WHERE name = 'super_admin'");
    if (!superAdminRole.rows[0]) {
      throw new Error('super_admin role not found');
    }
    const roleId = superAdminRole.rows[0].id;
    
    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE iin = $1', [iin]);
    if (existing.rows.length) {
      await pool.query('UPDATE users SET password_hash = $1, role_id = $2, school_id = 1, is_active = TRUE WHERE iin = $3', [hash, roleId, iin]);
      console.log('Super Admin updated.');
    } else {
      await pool.query(
        "INSERT INTO users (full_name, iin, password_hash, role_id, school_id) VALUES ($1, $2, $3, $4, 1)",
        ['Глобалды басқарушы', iin, hash, roleId]
      );
      console.log('Super Admin created.');
    }
    console.log(`Credentials: IIN=${iin}, Password=${password}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
