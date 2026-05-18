require('dotenv').config();

const { centralQuery, pool, endTenantPools } = require('../src/config/db');
const {
  buildTenantDatabaseName,
  ensureCentralTenantColumns,
  provisionSchoolDatabase
} = require('../src/services/tenantDatabaseService');

const force = process.argv.includes('--force');

async function run() {
  await ensureCentralTenantColumns();
  const result = await centralQuery(
    `SELECT id, name, slug, code, domain, subdomain, is_active, database_name, database_status
     FROM schools
     WHERE is_active = TRUE
     ORDER BY id`
  );

  for (const school of result.rows) {
    if (!force && school.database_status === 'ready' && school.database_name) {
      console.log(`Skip ${school.name}: already ready (${school.database_name})`);
      continue;
    }

    const databaseName = school.database_name || buildTenantDatabaseName(school.slug, school.code);
    await centralQuery(
      `UPDATE schools SET database_name = $1, database_status = 'provisioning', database_error = NULL
       WHERE id = $2`,
      [databaseName, school.id]
    );

    try {
      const provisioned = await provisionSchoolDatabase({
        school: { ...school, database_name: databaseName },
        admin: { admin_name: `${school.name} әкімші` }
      });

      await centralQuery(
        `UPDATE schools SET database_status = 'ready', database_created_at = NOW(), database_error = NULL
         WHERE id = $1`,
        [school.id]
      );

      console.log(
        `Ready ${school.name}: ${databaseName}; admin IIN=${provisioned.default_admin.iin}; password=${provisioned.default_password || '(unchanged)'}`
      );
    } catch (error) {
      await centralQuery(
        `UPDATE schools SET database_status = 'failed', database_error = $1
         WHERE id = $2`,
        [error.message, school.id]
      );
      console.error(`Failed ${school.name}: ${error.message}`);
    }
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await endTenantPools().catch(() => {});
    await pool.end().catch(() => {});
  });
