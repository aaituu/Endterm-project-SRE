const ExcelJS = require('exceljs');

const commonStatusHelp = 'active | inactive';
const ENABLED_CATEGORIES = ['students', 'staff', 'parents'];

const CATEGORY_DEFINITIONS = {
  students: {
    key: 'students',
    label: 'Оқушылар',
    description: 'Оқушы аккаунттары және сыныпқа бекіту',
    defaultRole: 'student',
    options: { update_existing: false, create_missing_classes: true },
    columns: [
      { key: 'iin', label: 'IIN', required: true, example: '170905504970', help: '12 digits. Used as student login.' },
      { key: 'last_name', label: 'last_name', required: true, example: 'SOVET' },
      { key: 'first_name', label: 'first_name', required: true, example: 'SULTAN' },
      { key: 'middle_name', label: 'middle_name', example: 'ALMAZULY' },
      { key: 'class_literal', label: 'class_literal', example: '3A', help: 'Optional if grade_number and class_letter are filled.' },
      { key: 'grade_number', label: 'grade_number', example: '3' },
      { key: 'class_letter', label: 'class_letter', example: 'A' },
      { key: 'stream', label: 'stream', example: 'daytime', help: 'daytime/evening, 1/2, first/second shift.' },
      { key: 'gender', label: 'gender', example: 'male' },
      { key: 'birth_date', label: 'birth_date', example: '2017-09-05', help: 'YYYY-MM-DD.' },
      { key: 'parent_iin', label: 'parent_iin', example: '850101400001' },
      { key: 'parent_phone', label: 'parent_phone', example: '+77011234567' },
      { key: 'phone', label: 'phone', example: '+77017654321' },
      { key: 'status', label: 'status', example: 'active', help: commonStatusHelp }
    ],
    aliases: {
      iin: ['iin', 'iin/login', 'login', 'жсн', 'иин'],
      last_name: ['last_name', 'surname', 'family_name', 'жөні', 'фамилия', 'тегі'],
      first_name: ['first_name', 'name', 'аты', 'имя'],
      middle_name: ['middle_name', 'patronymic', 'әкесінің аты', 'отчество'],
      class_literal: ['class_literal', 'class', 'class_name', 'сынып', 'класс'],
      grade_number: ['grade_number', 'grade', 'parallel', 'параллель', 'параллель 207'],
      class_letter: ['class_letter', 'letter', 'liter', 'литера', 'литера 6668'],
      stream: ['stream', 'shift', 'flow', 'schedule_shift', 'аусым', 'смена', 'поток'],
      gender: ['gender', 'жынысы', 'жынысы 206', 'пол'],
      birth_date: ['birth_date', 'birthday', 'date_of_birth', 'туған күні', 'дата рождения'],
      parent_iin: ['parent_iin', 'parent iin', 'ата-ана жсн', 'родитель иин'],
      parent_phone: ['parent_phone', 'parent phone', 'ата-ана телефоны', 'телефон родителя'],
      phone: ['phone', 'телефон'],
      status: ['status', 'мәртебе', 'статус']
    }
  },
  staff: {
    key: 'staff',
    label: 'Қызметкерлер',
    description: 'Мұғалімдер, директор, психолог және басқа мектеп қызметкерлері',
    defaultRole: 'teacher',
    options: { update_existing: false },
    columns: [
      { key: 'iin', label: 'IIN', required: true, example: '861030402443', help: '12 digits. Used as login.' },
      { key: 'last_name', label: 'last_name', required: true, example: 'AKHMETOVA' },
      { key: 'first_name', label: 'first_name', required: true, example: 'GALIYA' },
      { key: 'middle_name', label: 'middle_name', example: 'MAKHSUTKHANOVNA' },
      { key: 'phone', label: 'phone', example: '+77011234567' },
      { key: 'email', label: 'email', example: 'teacher@example.com' },
      { key: 'position', label: 'position', example: 'Teacher' },
      { key: 'role', label: 'role', example: 'teacher', help: 'Existing role slug. Blank means teacher.' },
      { key: 'subjects', label: 'subjects', example: 'Math, Physics' },
      { key: 'employment_status', label: 'employment_status', example: 'active' },
      { key: 'status', label: 'status', example: 'active', help: commonStatusHelp }
    ],
    aliases: {
      iin: ['iin', 'login', 'жсн', 'иин'],
      last_name: ['last_name', 'surname', 'жөні', 'фамилия', 'тегі'],
      first_name: ['first_name', 'name', 'аты', 'имя'],
      middle_name: ['middle_name', 'patronymic', 'әкесінің аты', 'отчество'],
      phone: ['phone', 'телефон'],
      email: ['email', 'e-mail', 'почта'],
      position: ['position', 'лауазым', 'лауазым 6649', 'должность'],
      role: ['role', 'роль', 'рөлі'],
      subjects: ['subjects', 'subject', 'пәндер', 'пән', 'предметы'],
      employment_status: ['employment_status', 'employment status', 'жұмыс мәртебесі'],
      status: ['status', 'мәртебе', 'статус']
    }
  },
  parents: {
    key: 'parents',
    label: 'Ата-аналар',
    description: 'Оқушымен ЖСН арқылы байланысатын ата-ана аккаунттары',
    defaultRole: 'parent',
    options: { update_existing: false },
    columns: [
      { key: 'iin', label: 'IIN', required: true, example: '850101400001', help: '12 digits. Used as login.' },
      { key: 'last_name', label: 'last_name', required: true, example: 'SOVET' },
      { key: 'first_name', label: 'first_name', required: true, example: 'ALMAZ' },
      { key: 'middle_name', label: 'middle_name', example: 'NURULY' },
      { key: 'phone', label: 'phone', example: '+77011234567' },
      { key: 'email', label: 'email', example: 'parent@example.com' },
      { key: 'linked_student_iin', label: 'linked_student_iin', required: true, example: '170905504970' },
      { key: 'relation_type', label: 'relation_type', example: 'father', help: 'father | mother | guardian' },
      { key: 'status', label: 'status', example: 'active', help: commonStatusHelp }
    ],
    aliases: {
      iin: ['iin', 'login', 'жсн', 'иин'],
      last_name: ['last_name', 'surname', 'жөні', 'фамилия', 'тегі'],
      first_name: ['first_name', 'name', 'аты', 'имя'],
      middle_name: ['middle_name', 'patronymic', 'әкесінің аты', 'отчество'],
      phone: ['phone', 'телефон'],
      email: ['email', 'e-mail', 'почта'],
      linked_student_iin: ['linked_student_iin', 'student_iin', 'оқушы жсн', 'ученик иин'],
      relation_type: ['relation_type', 'relation', 'қатысы', 'родство'],
      status: ['status', 'мәртебе', 'статус']
    }
  },
  administration: {
    key: 'administration',
    label: 'Administration Users',
    description: 'School admin, director and management users',
    defaultRole: 'admin',
    options: { update_existing: false },
    columns: [
      { key: 'iin', label: 'IIN', required: true, example: '800101400001', help: '12 digits. Used as login.' },
      { key: 'last_name', label: 'last_name', required: true, example: 'NURLANOV' },
      { key: 'first_name', label: 'first_name', required: true, example: 'DIDAR' },
      { key: 'middle_name', label: 'middle_name', example: 'ERLANOVICH' },
      { key: 'phone', label: 'phone', example: '+77011234567' },
      { key: 'email', label: 'email', example: 'admin@example.com' },
      { key: 'position', label: 'position', example: 'Director' },
      { key: 'role', label: 'role', example: 'director', help: 'Existing role slug. Blank means admin.' },
      { key: 'status', label: 'status', example: 'active', help: commonStatusHelp }
    ],
    aliases: {
      iin: ['iin', 'login', 'жсн', 'иин'],
      last_name: ['last_name', 'surname', 'жөні', 'фамилия', 'тегі'],
      first_name: ['first_name', 'name', 'аты', 'имя'],
      middle_name: ['middle_name', 'patronymic', 'әкесінің аты', 'отчество'],
      phone: ['phone', 'телефон'],
      email: ['email', 'e-mail', 'почта'],
      position: ['position', 'лауазым', 'должность'],
      role: ['role', 'роль', 'рөлі'],
      status: ['status', 'мәртебе', 'статус']
    }
  },
  other: {
    key: 'other',
    label: 'Other Roles',
    description: 'Any existing non-specialized role',
    defaultRole: null,
    options: { update_existing: false },
    columns: [
      { key: 'iin', label: 'IIN', required: true, example: '900101400001', help: '12 digits. Used as login.' },
      { key: 'last_name', label: 'last_name', required: true, example: 'USER' },
      { key: 'first_name', label: 'first_name', required: true, example: 'SAMPLE' },
      { key: 'middle_name', label: 'middle_name', example: 'TESTULY' },
      { key: 'phone', label: 'phone', example: '+77011234567' },
      { key: 'email', label: 'email', example: 'user@example.com' },
      { key: 'role', label: 'role', required: true, example: 'librarian', help: 'Existing role slug is required.' },
      { key: 'status', label: 'status', example: 'active', help: commonStatusHelp }
    ],
    aliases: {
      iin: ['iin', 'login', 'жсн', 'иин'],
      last_name: ['last_name', 'surname', 'жөні', 'фамилия', 'тегі'],
      first_name: ['first_name', 'name', 'аты', 'имя'],
      middle_name: ['middle_name', 'patronymic', 'әкесінің аты', 'отчество'],
      phone: ['phone', 'телефон'],
      email: ['email', 'e-mail', 'почта'],
      role: ['role', 'роль', 'рөлі'],
      status: ['status', 'мәртебе', 'статус']
    }
  }
};

function getCategoryDefinition(category) {
  if (!ENABLED_CATEGORIES.includes(category)) return null;
  return CATEGORY_DEFINITIONS[category] || null;
}

function listCategories() {
  return ENABLED_CATEGORIES.map((key) => CATEGORY_DEFINITIONS[key]).map((definition) => ({
    key: definition.key,
    label: definition.label,
    description: definition.description,
    default_role: definition.defaultRole,
    options: definition.options,
    columns: definition.columns.map((column) => ({
      key: column.key,
      label: column.label,
      required: !!column.required,
      help: column.help || null,
      example: column.example || ''
    }))
  }));
}

function buildAliasMap(definition) {
  const map = new Map();
  for (const column of definition.columns) {
    map.set(normalizeHeader(column.key), column.key);
    map.set(normalizeHeader(column.label), column.key);
  }
  for (const [key, aliases] of Object.entries(definition.aliases || {})) {
    for (const alias of aliases) {
      map.set(normalizeHeader(alias), key);
    }
  }
  return map;
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, '')
    .replace(/[()]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function buildTemplateWorkbook(category) {
  const definition = getCategoryDefinition(category);
  if (!definition) {
    const err = new Error('Импорт санаты қолдау көрсетілмейді');
    err.status = 400;
    throw err;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'School Management Platform';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(definition.label.replace(/[\\/*?:[\]]/g, '-').slice(0, 31));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const headers = definition.columns.map((column) => column.key);
  sheet.addRow(headers);
  sheet.addRow(definition.columns.map((column) => column.example || ''));

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });
  sheet.getRow(2).font = { italic: true, color: { argb: 'FF475569' } };

  definition.columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = Math.max(16, column.key.length + 4, String(column.example || '').length + 4);
    const headerCell = sheet.getCell(1, index + 1);
    headerCell.note = `${column.required ? 'Required. ' : ''}${column.help || ''}`.trim();
  });

  const notes = workbook.addWorksheet('Instructions');
  notes.columns = [
    { header: 'Өріс', key: 'field', width: 28 },
    { header: 'Міндетті', key: 'required', width: 12 },
    { header: 'Сипаттама', key: 'description', width: 56 },
    { header: 'Мысал', key: 'example', width: 24 }
  ];
  notes.getRow(1).font = { bold: true };
  definition.columns.forEach((column) => {
    notes.addRow({
      field: column.key,
      required: column.required ? 'иә' : 'жоқ',
      description: column.help || '',
      example: column.example || ''
    });
  });

  notes.addRow({});
  notes.addRow({ field: 'Маңызды', description: 'Бірінші жолдағы баған кілттерін өзгертпеңіз. Бос жолдар ескерілмейді.' });
  if (category === 'students') {
    notes.addRow({ field: 'Сынып', description: 'class_literal (мысалы 5A) немесе grade_number + class_letter бағандарын қолданыңыз.' });
  }

  return workbook;
}

module.exports = {
  CATEGORY_DEFINITIONS,
  buildAliasMap,
  buildTemplateWorkbook,
  getCategoryDefinition,
  listCategories,
  normalizeHeader
};
