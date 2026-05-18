require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { listCategories, buildTemplateWorkbook } = require('../src/services/templateService');

async function main() {
  const outDir = path.join(__dirname, '..', 'resources', 'templates');
  fs.mkdirSync(outDir, { recursive: true });

  for (const category of listCategories()) {
    const workbook = await buildTemplateWorkbook(category.key);
    const target = path.join(outDir, `user-import-${category.key}.xlsx`);
    await workbook.xlsx.writeFile(target);
    console.log(`Generated ${target}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
