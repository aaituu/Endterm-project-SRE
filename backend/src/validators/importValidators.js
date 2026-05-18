const { getCategoryDefinition } = require('../services/templateService');

const ROLE_ALIASES = {
  'мұғалім': 'teacher',
  'оқытушы': 'teacher',
  'оқытушы мұғалім': 'teacher',
  'оқытушы/ мұғалім': 'teacher',
  'учитель': 'teacher',
  teacher: 'teacher',
  admin: 'admin',
  'әкімші': 'admin',
  administrator: 'admin',
  director: 'director',
  'директор': 'director',
  parent: 'parent',
  'ата ана': 'parent',
  'ата-ана': 'parent',
  student: 'student',
  'оқушы': 'student',
  librarian: 'librarian',
  'кітапханашы': 'librarian',
  nurse: 'nurse',
  'мейіргер': 'nurse',
  psychologist: 'psychologist',
  'психолог': 'psychologist'
};

const POSITION_ROLE_ALIASES = [
  { pattern: /директор(?!.*орынбас|.*зам|.*замест)/i, role: 'director' },
  { pattern: /оқу|учеб|завуч|орынбасар|заместитель/i, role: 'deputy_education' },
  { pattern: /тәрбие|воспит/i, role: 'deputy_culture' },
  { pattern: /психолог/i, role: 'psychologist' },
  { pattern: /кітапхан|библиотек/i, role: 'librarian' },
  { pattern: /мейіргер|медбике|медсестра| nurse/i, role: 'nurse' },
  { pattern: /хатшы|секретар/i, role: 'secretary' },
  { pattern: /лаборант|зертхана/i, role: 'lab_assistant' },
  { pattern: /ұйымдастырушы|организатор/i, role: 'organizer_teacher' },
  { pattern: /ассистент|көмекші/i, role: 'assistant_teacher' },
  { pattern: /тәлімгер|наставник/i, role: 'mentor' }
];

const ACTIVE_VALUES = new Set(['', 'active', 'enabled', 'true', 'yes', '1', 'белсенді', 'оқиды', 'жұмыс істейді']);
const INACTIVE_VALUES = new Set(['inactive', 'disabled', 'false', 'no', '0', 'белсенді емес', 'шықты', 'жұмыстан шықты']);

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeIin(value) {
  if (value === null || value === undefined || value === '') return '';
  const raw = String(value).trim();
  const digits = onlyDigits(raw);
  if (!digits) return '';
  if (/^\d+(\.0+)?$/.test(raw) && digits.length < 12) return digits.padStart(12, '0');
  return digits;
}

function normalizePhone(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const plus = text.startsWith('+') ? '+' : '';
  return plus + text.replace(/\D/g, '');
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase().replace(/[()]/g, '').replace(/\s+/g, ' ');
}

function parseStatus(value) {
  const key = normalizeKey(value);
  if (INACTIVE_VALUES.has(key)) return { is_active: false, status: key || 'inactive' };
  if (ACTIVE_VALUES.has(key)) return { is_active: true, status: key || 'active' };
  return { is_active: true, status: key || 'active', warning: 'Мәртебе белгісіз, белсенді деп қабылданды' };
}

function parseDate(value) {
  if (!value) return null;
  const text = normalizeText(value);
  if (!text) return null;
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return text;
  const dotted = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dotted) {
    const day = dotted[1].padStart(2, '0');
    const month = dotted[2].padStart(2, '0');
    return `${dotted[3]}-${month}-${day}`;
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function parseGrade(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const match = text.match(/\d{1,2}/);
  return match ? match[0] : text;
}

function normalizeClassLetter(value) {
  return normalizeText(value).toUpperCase();
}

function normalizeShift(value) {
  const text = normalizeKey(value);
  if (!text) return 'daytime';
  if (['2', 'second', 'evening', 'кешкі', 'екінші', '2 ауысым', '2 смена'].includes(text)) return 'evening';
  return 'daytime';
}

function normalizeClassName(row) {
  const literal = normalizeText(row.class_literal).replace(/\s+/g, '');
  if (literal) return literal.toUpperCase();
  const grade = parseGrade(row.grade_number);
  const letter = normalizeClassLetter(row.class_letter);
  if (grade && letter) return `${grade}${letter}`;
  return '';
}

function buildFullName(row) {
  return [row.last_name, row.first_name, row.middle_name].map(normalizeText).filter(Boolean).join(' ');
}

function addIssue(target, severity, field, message) {
  target.push({ severity, field: field || null, message });
}

function roleFromValue(value, definition, roles) {
  const requested = normalizeKey(value || definition.defaultRole || '');
  if (!requested) return null;
  const alias = ROLE_ALIASES[requested] || requested.replace(/\s+/g, '_');
  const byName = roles.find((role) => role.name.toLowerCase() === alias.toLowerCase());
  if (byName) return byName;
  const byLabel = roles.find((role) => normalizeKey(role.label_kz) === requested || normalizeKey(role.display_name) === requested);
  return byLabel || null;
}

function inferStaffRoleFromPosition(position) {
  const text = normalizeText(position);
  if (!text) return '';
  const match = POSITION_ROLE_ALIASES.find((item) => item.pattern.test(text));
  return match?.role || '';
}

function makeNormalizedRow(category, source, roles) {
  const definition = getCategoryDefinition(category);
  const status = parseStatus(source.status || source.employment_status);
  const requestedRoleValue = category === 'staff' && !normalizeText(source.role)
    ? (inferStaffRoleFromPosition(source.position) || definition.defaultRole)
    : (source.role || definition.defaultRole || '');
  const normalized = {
    iin: normalizeIin(source.iin),
    first_name: normalizeText(source.first_name),
    last_name: normalizeText(source.last_name),
    middle_name: normalizeText(source.middle_name),
    full_name: buildFullName(source),
    phone: normalizePhone(source.phone),
    email: normalizeEmail(source.email),
    role: roleFromValue(requestedRoleValue, definition, roles),
    requested_role: normalizeText(requestedRoleValue),
    is_active: status.is_active,
    status: status.status
  };
  if (status.warning) normalized.status_warning = status.warning;

  if (category === 'students') {
    normalized.role = roleFromValue('student', definition, roles);
    normalized.class_name = normalizeClassName(source);
    normalized.grade_number = parseGrade(source.grade_number || source.class_literal);
    normalized.class_letter = normalizeClassLetter(source.class_letter);
    normalized.stream = normalizeText(source.stream);
    normalized.schedule_shift = normalizeShift(source.stream);
    normalized.gender = normalizeText(source.gender).toLowerCase();
    normalized.birth_date = parseDate(source.birth_date);
    normalized.parent_iin = normalizeIin(source.parent_iin);
    normalized.parent_phone = normalizePhone(source.parent_phone);
  }

  if (category === 'parents') {
    normalized.role = roleFromValue('parent', definition, roles);
    normalized.linked_student_iin = normalizeIin(source.linked_student_iin);
    normalized.relation_type = normalizeKey(source.relation_type || 'guardian') || 'guardian';
  }

  if (category === 'staff') {
    normalized.position = normalizeText(source.position);
    normalized.subjects = normalizeText(source.subjects);
    normalized.employment_status = normalizeText(source.employment_status || source.status || 'active');
  }

  if (category === 'administration') {
    normalized.position = normalizeText(source.position);
  }

  return normalized;
}

function validateBase(row, normalized, category, issues) {
  if (!normalized.iin) addIssue(issues, 'error', 'iin', 'ЖСН көрсетілмеген');
  else if (!/^\d{12}$/.test(normalized.iin)) addIssue(issues, 'error', 'iin', 'ЖСН дәл 12 цифрдан тұруы керек');

  if (!normalized.last_name) addIssue(issues, 'error', 'last_name', 'Тегі міндетті');
  if (!normalized.first_name) addIssue(issues, 'error', 'first_name', 'Аты міндетті');
  if (!normalized.full_name) addIssue(issues, 'error', 'full_name', 'Аты-жөнін құрастыру мүмкін болмады');
  if (!normalized.role) addIssue(issues, 'error', 'role', `"${normalized.requested_role || row.role || ''}" рөлі қолдау көрсетілмейді`);

  if (normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    addIssue(issues, 'error', 'email', 'Email форматы қате');
  }
  if (normalized.phone && normalized.phone.replace(/\D/g, '').length < 10) {
    addIssue(issues, 'warning', 'phone', 'Телефон нөмірі тым қысқа сияқты');
  }

  if (normalized.status_warning) addIssue(issues, 'warning', 'status', normalized.status_warning);

  if (category === 'students') {
    if (!normalized.class_name) {
      addIssue(issues, 'error', 'class_literal', 'Сынып міндетті: class_literal немесе grade_number + class_letter толтырыңыз');
    }
    if (row.birth_date && !normalized.birth_date) addIssue(issues, 'error', 'birth_date', 'Туған күн форматы YYYY-MM-DD болуы керек');
  }

  if (category === 'parents') {
    if (!normalized.linked_student_iin) addIssue(issues, 'error', 'linked_student_iin', 'Оқушының ЖСН міндетті');
    else if (!/^\d{12}$/.test(normalized.linked_student_iin)) addIssue(issues, 'error', 'linked_student_iin', 'Оқушының ЖСН дәл 12 цифрдан тұруы керек');
    if (!['father', 'mother', 'guardian', 'other', 'ата', 'ана', 'қамқоршы'].includes(normalized.relation_type)) {
      addIssue(issues, 'warning', 'relation_type', 'Туыстық түрі белгісіз, файлдағы мән бойынша сақталады');
    }
  }
}

async function fetchRoles(db) {
  const result = await db.query('SELECT id, name, label_kz, label_kz AS display_name FROM roles ORDER BY id');
  return result.rows;
}

async function fetchExistingUsers(db, iins) {
  if (!iins.length) return new Map();
  const result = await db.query(
    `SELECT u.id, u.iin, u.school_id, u.role_id, u.teacher_id, u.email, u.phone, r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.iin = ANY($1)`,
    [iins]
  );
  return new Map(result.rows.map((row) => [row.iin, row]));
}

async function fetchExistingStudents(db, iins) {
  if (!iins.length) return new Map();
  const result = await db.query('SELECT id, iin, school_id, class_id, user_id FROM students WHERE iin = ANY($1)', [iins]);
  return new Map(result.rows.map((row) => [row.iin, row]));
}

async function fetchClasses(db, schoolId, classNames) {
  if (!classNames.length) return new Map();
  const result = await db.query(
    `SELECT id, name, school_id, schedule_shift
     FROM classes
     WHERE school_id = $1 AND LOWER(name) = ANY($2)`,
    [schoolId, classNames.map((name) => name.toLowerCase())]
  );
  return new Map(result.rows.map((row) => [row.name.toLowerCase(), row]));
}

async function fetchLinkedStudents(db, schoolId, iins) {
  if (!iins.length) return new Map();
  const result = await db.query(
    'SELECT id, iin, school_id, full_name FROM students WHERE school_id = $1 AND iin = ANY($2)',
    [schoolId, iins]
  );
  return new Map(result.rows.map((row) => [row.iin, row]));
}

async function fetchEmails(db, schoolId, emails) {
  if (!emails.length) return new Map();
  const result = await db.query(
    `SELECT id, iin, LOWER(email) AS email
     FROM users
     WHERE school_id = $1 AND email IS NOT NULL AND LOWER(email) = ANY($2)`,
    [schoolId, emails]
  );
  const map = new Map();
  for (const row of result.rows) {
    if (!map.has(row.email)) map.set(row.email, []);
    map.get(row.email).push(row);
  }
  return map;
}

async function validateRows({ db, schoolId, category, parsedRows, parseMeta = {}, options = {} }) {
  const definition = getCategoryDefinition(category);
  if (!definition) {
    const err = new Error('Импорт санаты қолдау көрсетілмейді');
    err.status = 400;
    throw err;
  }

  const importOptions = {
    update_existing: options.update_existing === true || options.update_existing === 'true',
    create_missing_classes: options.create_missing_classes !== false && options.create_missing_classes !== 'false'
  };

  const batchIssues = [];
  for (const column of parseMeta.missing_required_columns || []) {
    addIssue(batchIssues, 'error', column, `"${column}" міндетті бағаны жоқ`);
  }
  for (const header of parseMeta.unsupported_headers || []) {
    addIssue(batchIssues, 'warning', null, `"${header}" бағаны қолдау көрсетілмейді және ескерілмеді`);
  }
  if ((parseMeta.empty_rows || []).length) {
    addIssue(batchIssues, 'warning', null, `${parseMeta.empty_rows.length} бос жол ескерілмеді`);
  }

  const roles = await fetchRoles(db);
  const normalizedRows = parsedRows.map((row) => ({
    row_number: row.row_number,
    data: row.data,
    normalized: makeNormalizedRow(category, row.data, roles),
    issues: [],
    action: 'create'
  }));

  const iins = [...new Set(normalizedRows.map((row) => row.normalized.iin).filter(Boolean))];
  const studentIins = category === 'parents'
    ? [...new Set(normalizedRows.map((row) => row.normalized.linked_student_iin).filter(Boolean))]
    : iins;
  const classNames = category === 'students'
    ? [...new Set(normalizedRows.map((row) => row.normalized.class_name).filter(Boolean))]
    : [];
  const emails = [...new Set(normalizedRows.map((row) => row.normalized.email).filter(Boolean))];

  const existingUsers = await fetchExistingUsers(db, iins);
  const existingStudents = category === 'students' ? await fetchExistingStudents(db, iins) : new Map();
  const existingClasses = await fetchClasses(db, schoolId, classNames);
  const linkedStudents = category === 'parents' ? await fetchLinkedStudents(db, schoolId, studentIins) : new Map();
  const existingEmails = await fetchEmails(db, schoolId, emails);

  const fileIinCounts = new Map();
  const parentLinkCounts = new Map();
  for (const row of normalizedRows) {
    if (!row.normalized.iin) continue;
    if (category === 'parents') {
      const key = `${row.normalized.iin}:${row.normalized.linked_student_iin || ''}`;
      parentLinkCounts.set(key, (parentLinkCounts.get(key) || 0) + 1);
    } else {
      fileIinCounts.set(row.normalized.iin, (fileIinCounts.get(row.normalized.iin) || 0) + 1);
    }
  }

  for (const row of normalizedRows) {
    const issues = row.issues;
    validateBase(row.data, row.normalized, category, issues);

    if (category === 'parents') {
      const key = `${row.normalized.iin}:${row.normalized.linked_student_iin || ''}`;
      if (parentLinkCounts.get(key) > 1) addIssue(issues, 'error', 'iin', 'Файлда ата-ана/оқушы жұбы қайталанған');
    } else if (row.normalized.iin && fileIinCounts.get(row.normalized.iin) > 1) {
      addIssue(issues, 'error', 'iin', 'Файлда ЖСН қайталанған');
    }

    const existingUser = existingUsers.get(row.normalized.iin);
    if (existingUser) {
      row.existing_user_id = existingUser.id;
      if (Number(existingUser.school_id) !== Number(schoolId)) {
        addIssue(issues, 'error', 'iin', 'ЖСН басқа мектепке тиесілі');
      } else if (importOptions.update_existing) {
        row.action = 'update';
        addIssue(issues, 'warning', 'iin', 'Бар пайдаланушы жаңартылады');
      } else if (category === 'parents') {
        row.action = 'link';
        addIssue(issues, 'warning', 'iin', 'Бар ата-ана аккаунты жаңартылмай, оқушымен байланыстырылады');
      } else {
        row.action = 'skip';
        addIssue(issues, 'warning', 'iin', 'Бар пайдаланушы өткізіледі, жаңарту параметрін қосыңыз');
      }
    }

    if (category === 'students') {
      const existingStudent = existingStudents.get(row.normalized.iin);
      if (existingStudent) {
        row.existing_student_id = existingStudent.id;
        if (Number(existingStudent.school_id) !== Number(schoolId)) {
          addIssue(issues, 'error', 'iin', 'Оқушы ЖСН басқа мектепке тиесілі');
        } else if (importOptions.update_existing) {
          row.action = 'update';
          addIssue(issues, 'warning', 'iin', 'Бар оқушы профилі жаңартылады');
        } else {
          row.action = 'skip';
          addIssue(issues, 'warning', 'iin', 'Бар оқушы профилі өткізіледі, жаңарту параметрін қосыңыз');
        }
      }

      if (row.normalized.class_name) {
        const cls = existingClasses.get(row.normalized.class_name.toLowerCase());
        if (cls) {
          row.class_id = cls.id;
          row.class_name = cls.name;
        } else if (importOptions.create_missing_classes) {
          row.class_name = row.normalized.class_name;
          row.will_create_class = true;
          addIssue(issues, 'warning', 'class_literal', `${row.normalized.class_name} сыныбы автоматты құрылады`);
        } else {
          addIssue(issues, 'error', 'class_literal', `${row.normalized.class_name} сыныбы табылмады`);
        }
      }
    }

    if (category === 'parents') {
      const linked = linkedStudents.get(row.normalized.linked_student_iin);
      if (linked) {
        row.linked_student_id = linked.id;
        row.linked_student_name = linked.full_name;
      } else if (row.normalized.linked_student_iin) {
        addIssue(issues, 'error', 'linked_student_iin', 'Көрсетілген оқушы осы мектептен табылмады');
      }
    }

    const emailUsers = normalizedRows.length && row.normalized.email ? existingEmails.get(row.normalized.email) || [] : [];
    const emailDuplicate = emailUsers.find((user) => user.iin !== row.normalized.iin);
    if (emailDuplicate && ['staff', 'administration', 'other'].includes(category)) {
      addIssue(issues, 'error', 'email', 'Email осы мектептегі басқа пайдаланушыда бар');
    } else if (emailDuplicate) {
      addIssue(issues, 'warning', 'email', 'Email осы мектептегі басқа пайдаланушыда бар');
    }

    row.errors = issues.filter((issue) => issue.severity === 'error');
    row.warnings = issues.filter((issue) => issue.severity === 'warning');
    row.valid = row.errors.length === 0;
  }

  const flattenedIssues = [];
  for (const issue of batchIssues) {
    flattenedIssues.push({ row_number: null, ...issue });
  }
  for (const row of normalizedRows) {
    for (const issue of row.issues) {
      flattenedIssues.push({ row_number: row.row_number, ...issue });
    }
  }

  const summary = {
    total_rows: normalizedRows.length,
    valid_rows: normalizedRows.filter((row) => row.valid).length,
    invalid_rows: normalizedRows.filter((row) => !row.valid).length,
    will_create: normalizedRows.filter((row) => row.valid && row.action === 'create').length,
    will_update: normalizedRows.filter((row) => row.valid && row.action === 'update').length,
    will_link: normalizedRows.filter((row) => row.valid && row.action === 'link').length,
    will_skip: normalizedRows.filter((row) => row.valid && row.action === 'skip').length,
    errors: flattenedIssues.filter((issue) => issue.severity === 'error').length,
    warnings: flattenedIssues.filter((issue) => issue.severity === 'warning').length
  };

  return {
    category,
    options: importOptions,
    rows: normalizedRows,
    issues: flattenedIssues,
    summary
  };
}

module.exports = {
  normalizeClassName,
  normalizeEmail,
  normalizeIin,
  normalizePhone,
  normalizeShift,
  parseStatus,
  validateRows
};
