const fs = require('fs/promises');
const bcrypt = require('bcryptjs');
const { getClient, query } = require('../config/db');
const { getCategoryDefinition, listCategories, buildTemplateWorkbook } = require('./templateService');
const { parseExcelFile } = require('../utils/excelParser');
const { validateRows } = require('../validators/importValidators');

const TEACHER_PROFILE_ROLES = new Set([
  'teacher',
  'assistant_teacher',
  'organizer_teacher',
  'extracurricular_teacher',
  'sport_instructor',
  'labor_instructor',
  'club_leader',
  'mentor',
  'career_counselor',
  'psychologist',
  'deputy_education',
  'deputy_culture',
  'deputy_profile'
]);

const ADMINISTRATION_PROFILE_ROLES = new Set([
  'admin',
  'director',
  'deputy_education',
  'deputy_culture',
  'deputy_profile',
  'secretary'
]);

function getSchoolYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function generateTemporaryPassword() {
  return '123456';
}

function publicRow(row) {
  return {
    row_number: row.row_number,
    data: row.data,
    normalized: row.normalized,
    action: row.action,
    valid: row.valid,
    class_id: row.class_id || null,
    class_name: row.class_name || row.normalized?.class_name || null,
    will_create_class: !!row.will_create_class,
    linked_student_id: row.linked_student_id || null,
    linked_student_name: row.linked_student_name || null,
    errors: row.errors || [],
    warnings: row.warnings || []
  };
}

function publicValidation(validation) {
  return {
    category: validation.category,
    options: validation.options,
    summary: validation.summary,
    issues: validation.issues,
    rows: validation.rows.map(publicRow)
  };
}

async function templateBuffer(category) {
  const workbook = await buildTemplateWorkbook(category);
  return workbook.xlsx.writeBuffer();
}

async function createBatchFromUpload({ file, category, schoolId, userId, options = {} }) {
  const definition = getCategoryDefinition(category);
  if (!definition) {
    const err = new Error('Импорт санаты қолдау көрсетілмейді');
    err.status = 400;
    throw err;
  }
  if (!file) {
    const err = new Error('Excel файлы міндетті');
    err.status = 400;
    throw err;
  }

  let parsed;
  try {
    parsed = await parseExcelFile(file.path, definition);
  } finally {
    await fs.unlink(file.path).catch(() => {});
  }

  const validation = await validateRows({
    db: { query },
    schoolId,
    category,
    parsedRows: parsed.rows,
    parseMeta: parsed,
    options
  });

  const result = await query(
    `INSERT INTO user_import_batches (
      school_id, category, status, original_filename, uploaded_by, options,
      total_rows, valid_rows, invalid_rows, error_count,
      parsed_rows, validation_errors, import_result, validated_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb,NOW(),NOW())
    RETURNING *`,
    [
      schoolId,
      category,
      validation.summary.errors ? 'validation_failed' : 'validated',
      file.originalname,
      userId,
      JSON.stringify(validation.options),
      validation.summary.total_rows,
      validation.summary.valid_rows,
      validation.summary.invalid_rows,
      validation.summary.errors,
      JSON.stringify(parsed.rows),
      JSON.stringify(validation.issues),
      JSON.stringify({ parse: {
        sheet_name: parsed.sheet_name,
        header_row: parsed.header_row,
        original_headers: parsed.original_headers,
        present_columns: parsed.present_columns,
        unsupported_headers: parsed.unsupported_headers,
        missing_required_columns: parsed.missing_required_columns,
        empty_rows_count: parsed.empty_rows.length
      } })
    ]
  );

  return {
    batch: result.rows[0],
    parse: {
      sheet_name: parsed.sheet_name,
      header_row: parsed.header_row,
      original_headers: parsed.original_headers,
      present_columns: parsed.present_columns,
      unsupported_headers: parsed.unsupported_headers,
      missing_required_columns: parsed.missing_required_columns,
      empty_rows: parsed.empty_rows
    },
    validation: publicValidation(validation)
  };
}

async function loadBatch(batchId, schoolId, db = { query }) {
  const result = await db.query(
    'SELECT * FROM user_import_batches WHERE id = $1 AND school_id = $2',
    [batchId, schoolId]
  );
  return result.rows[0] || null;
}

async function validateBatch({ batchId, schoolId, options = {} }) {
  const batch = await loadBatch(batchId, schoolId);
  if (!batch) {
    const err = new Error('Импорт пакеті табылмады');
    err.status = 404;
    throw err;
  }

  const mergedOptions = { ...(batch.options || {}), ...options };
  const validation = await validateRows({
    db: { query },
    schoolId,
    category: batch.category,
    parsedRows: batch.parsed_rows || [],
    parseMeta: {},
    options: mergedOptions
  });

  const updated = await query(
    `UPDATE user_import_batches SET
       status = $1,
       options = $2::jsonb,
       total_rows = $3,
       valid_rows = $4,
       invalid_rows = $5,
       error_count = $6,
       validation_errors = $7::jsonb,
       validated_at = NOW(),
       updated_at = NOW()
     WHERE id = $8 AND school_id = $9
     RETURNING *`,
    [
      validation.summary.errors ? 'validation_failed' : 'validated',
      JSON.stringify(validation.options),
      validation.summary.total_rows,
      validation.summary.valid_rows,
      validation.summary.invalid_rows,
      validation.summary.errors,
      JSON.stringify(validation.issues),
      batchId,
      schoolId
    ]
  );

  return { batch: updated.rows[0], validation: publicValidation(validation) };
}

async function getRoleByName(db, name) {
  const result = await db.query('SELECT id, name FROM roles WHERE name = $1', [name]);
  return result.rows[0] || null;
}

async function findUserByIin(db, iin) {
  const result = await db.query(
    `SELECT u.*, r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.iin = $1
     LIMIT 1`,
    [iin]
  );
  return result.rows[0] || null;
}

async function upsertUser(db, { normalized, schoolId, batchId, updateExisting, forceReuse = false }) {
  const existing = await findUserByIin(db, normalized.iin);
  const roleName = normalized.role.name;
  const role = await getRoleByName(db, roleName);
  if (!role) throw new Error(`${roleName} рөлі табылмады`);

  if (existing) {
    if (Number(existing.school_id) !== Number(schoolId)) {
      throw new Error('ЖСН басқа мектепке тиесілі');
    }
    if (!updateExisting && !forceReuse) {
      return { action: 'skipped', user: existing, temporary_password: null };
    }

    const updateFields = forceReuse && !updateExisting
      ? ['updated_at = NOW()']
      : [
          'full_name = $1',
          'first_name = $2',
          'last_name = $3',
          'middle_name = $4',
          'email = $5',
          'phone = $6',
          'role_id = $7',
          'is_active = $8',
          'imported_at = NOW()',
          'import_batch_id = $9',
          'updated_at = NOW()'
        ];

    if (forceReuse && !updateExisting) {
      await db.query('UPDATE users SET updated_at = NOW() WHERE id = $1', [existing.id]);
      return { action: 'existing', user: existing, temporary_password: null };
    }

    const result = await db.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $10 RETURNING *`,
      [
        normalized.full_name,
        normalized.first_name || null,
        normalized.last_name || null,
        normalized.middle_name || null,
        normalized.email || null,
        normalized.phone || null,
        role.id,
        normalized.is_active,
        batchId,
        existing.id
      ]
    );
    return { action: 'updated', user: result.rows[0], temporary_password: null };
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  const result = await db.query(
    `INSERT INTO users (
      full_name, first_name, last_name, middle_name, iin, password_hash,
      role_id, school_id, email, phone, is_active, password_reset_required,
      imported_at, import_batch_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE,NOW(),$12)
    RETURNING *`,
    [
      normalized.full_name,
      normalized.first_name || null,
      normalized.last_name || null,
      normalized.middle_name || null,
      normalized.iin,
      passwordHash,
      role.id,
      schoolId,
      normalized.email || null,
      normalized.phone || null,
      normalized.is_active,
      batchId
    ]
  );

  return { action: 'created', user: result.rows[0], temporary_password: temporaryPassword };
}

async function resolveClass(db, { normalized, schoolId, batchId, createMissing }) {
  const className = normalized.class_name;
  const existing = await db.query(
    'SELECT * FROM classes WHERE school_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1',
    [schoolId, className]
  );
  if (existing.rows[0]) return existing.rows[0];
  if (!createMissing) throw new Error(`${className} сыныбы табылмады`);

  const result = await db.query(
    `INSERT INTO classes (
      school_id, name, academic_year, language, is_active, section,
      schedule_shift, max_students, grade_label, description, import_batch_id, imported_at
    ) VALUES ($1,$2,$3,'kk',TRUE,$4,$5,30,$6,$7,$8,NOW())
    RETURNING *`,
    [
      schoolId,
      className,
      getSchoolYear(),
      normalized.class_letter || null,
      normalized.schedule_shift || 'daytime',
      normalized.grade_number || null,
      'Пайдаланушы импорты арқылы құрылды',
      batchId
    ]
  );
  return result.rows[0];
}

async function upsertStudent(db, { normalized, schoolId, userId, classId, batchId, updateExisting }) {
  const existing = await db.query('SELECT * FROM students WHERE iin = $1 LIMIT 1', [normalized.iin]);
  if (existing.rows[0]) {
    if (Number(existing.rows[0].school_id) !== Number(schoolId)) {
      throw new Error('Оқушы ЖСН басқа мектепке тиесілі');
    }
    if (!updateExisting) return { action: 'skipped', student: existing.rows[0] };
    const result = await db.query(
      `UPDATE students SET
        full_name = $1, first_name = $2, last_name = $3, middle_name = $4,
        class_id = $5, user_id = $6, is_active = $7, gender = $8,
        birth_date = $9, status = $10, parent_iin = $11, parent_phone = $12,
        stream = $13, imported_at = NOW(), import_batch_id = $14
       WHERE id = $15
       RETURNING *`,
      [
        normalized.full_name,
        normalized.first_name || null,
        normalized.last_name || null,
        normalized.middle_name || null,
        classId,
        userId,
        normalized.is_active,
        normalized.gender || null,
        normalized.birth_date || null,
        normalized.status || null,
        normalized.parent_iin || null,
        normalized.parent_phone || null,
        normalized.stream || null,
        batchId,
        existing.rows[0].id
      ]
    );
    return { action: 'updated', student: result.rows[0] };
  }

  const result = await db.query(
    `INSERT INTO students (
      school_id, full_name, first_name, last_name, middle_name, iin,
      class_id, user_id, is_active, gender, birth_date, status,
      parent_iin, parent_phone, stream, imported_at, import_batch_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),$16)
    RETURNING *`,
    [
      schoolId,
      normalized.full_name,
      normalized.first_name || null,
      normalized.last_name || null,
      normalized.middle_name || null,
      normalized.iin,
      classId,
      userId,
      normalized.is_active,
      normalized.gender || null,
      normalized.birth_date || null,
      normalized.status || null,
      normalized.parent_iin || null,
      normalized.parent_phone || null,
      normalized.stream || null,
      batchId
    ]
  );
  return { action: 'created', student: result.rows[0] };
}

async function maybeLinkStudentParent(db, { normalized, schoolId, studentId }) {
  if (!normalized.parent_iin) return null;
  const parent = await db.query(
    `SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.school_id = $1 AND u.iin = $2 AND r.name = 'parent'
     LIMIT 1`,
    [schoolId, normalized.parent_iin]
  );
  if (!parent.rows[0]) return null;
  await db.query(
    `INSERT INTO parent_student_links (school_id, parent_user_id, student_id, relation_type)
     VALUES ($1,$2,$3,'guardian')
     ON CONFLICT (school_id, parent_user_id, student_id)
     DO UPDATE SET updated_at = NOW()`,
    [schoolId, parent.rows[0].id, studentId]
  );
  return parent.rows[0].id;
}

async function upsertTeacherProfile(db, { normalized, user, schoolId, batchId, updateExisting }) {
  const existing = await db.query(
    `SELECT * FROM teachers
     WHERE school_id = $1 AND (iin = $2 OR id = $3)
     ORDER BY CASE WHEN iin = $2 THEN 0 ELSE 1 END
     LIMIT 1`,
    [schoolId, normalized.iin, user.teacher_id || null]
  );
  if (existing.rows[0]) {
    if (updateExisting) {
      const result = await db.query(
        `UPDATE teachers SET
          full_name = $1, subject = $2, position = $3, phone = $4,
          email = $5, employment_status = $6, iin = $7, is_active = $8,
          imported_at = NOW(), import_batch_id = $9, updated_at = NOW()
         WHERE id = $10
         RETURNING *`,
        [
          normalized.full_name,
          normalized.subjects || existing.rows[0].subject || null,
          normalized.position || null,
          normalized.phone || null,
          normalized.email || null,
          normalized.employment_status || null,
          normalized.iin,
          normalized.is_active,
          batchId,
          existing.rows[0].id
        ]
      );
      await db.query('UPDATE users SET teacher_id = $1 WHERE id = $2', [result.rows[0].id, user.id]);
      return { action: 'updated', teacher: result.rows[0] };
    }
    await db.query('UPDATE users SET teacher_id = $1 WHERE id = $2', [existing.rows[0].id, user.id]);
    return { action: 'existing', teacher: existing.rows[0] };
  }

  const result = await db.query(
    `INSERT INTO teachers (
      school_id, full_name, subject, position, phone, email,
      employment_status, iin, is_active, imported_at, import_batch_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),$10)
    RETURNING *`,
    [
      schoolId,
      normalized.full_name,
      normalized.subjects || null,
      normalized.position || null,
      normalized.phone || null,
      normalized.email || null,
      normalized.employment_status || null,
      normalized.iin,
      normalized.is_active,
      batchId
    ]
  );
  await db.query('UPDATE users SET teacher_id = $1 WHERE id = $2', [result.rows[0].id, user.id]);
  return { action: 'created', teacher: result.rows[0] };
}

async function upsertAdministrationProfile(db, { normalized, user, schoolId, batchId, updateExisting }) {
  const existing = await db.query(
    `SELECT * FROM administration
     WHERE school_id = $1 AND (iin = $2 OR user_id = $3)
     ORDER BY CASE WHEN iin = $2 THEN 0 ELSE 1 END
     LIMIT 1`,
    [schoolId, normalized.iin, user.id]
  );
  if (existing.rows[0]) {
    if (!updateExisting) return { action: 'existing', administration: existing.rows[0] };
    const result = await db.query(
      `UPDATE administration SET
        full_name = $1, position = $2, email = $3, phone = $4,
        is_active = $5, user_id = $6, iin = $7, imported_at = NOW(),
        import_batch_id = $8
       WHERE id = $9
       RETURNING *`,
      [
        normalized.full_name,
        normalized.position || existing.rows[0].position || 'Әкімшілік',
        normalized.email || null,
        normalized.phone || null,
        normalized.is_active,
        user.id,
        normalized.iin,
        batchId,
        existing.rows[0].id
      ]
    );
    return { action: 'updated', administration: result.rows[0] };
  }

  const result = await db.query(
    `INSERT INTO administration (
      school_id, full_name, position, email, phone, is_active,
      user_id, iin, imported_at, import_batch_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9)
    RETURNING *`,
    [
      schoolId,
      normalized.full_name,
      normalized.position || 'Әкімшілік',
      normalized.email || null,
      normalized.phone || null,
      normalized.is_active,
      user.id,
      normalized.iin,
      batchId
    ]
  );
  return { action: 'created', administration: result.rows[0] };
}

async function linkParentToStudent(db, { normalized, user, schoolId }) {
  const student = await db.query(
    'SELECT id FROM students WHERE school_id = $1 AND iin = $2 LIMIT 1',
    [schoolId, normalized.linked_student_iin]
  );
  if (!student.rows[0]) throw new Error('Көрсетілген оқушы осы мектептен табылмады');
  const result = await db.query(
    `INSERT INTO parent_student_links (school_id, parent_user_id, student_id, relation_type)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (school_id, parent_user_id, student_id)
     DO UPDATE SET relation_type = EXCLUDED.relation_type, updated_at = NOW()
     RETURNING *`,
    [schoolId, user.id, student.rows[0].id, normalized.relation_type || 'guardian']
  );
  return result.rows[0];
}

async function importValidatedRow(db, { row, category, schoolId, batchId, options }) {
  if (row.action === 'skip') {
    return { action: 'skipped', row_number: row.row_number, iin: row.normalized.iin };
  }

  const forceReuse = category === 'parents' || row.action === 'link';
  const userResult = await upsertUser(db, {
    normalized: row.normalized,
    schoolId,
    batchId,
    updateExisting: options.update_existing,
    forceReuse
  });

  if (userResult.action === 'skipped') {
    return { action: 'skipped', row_number: row.row_number, iin: row.normalized.iin, user_id: userResult.user.id };
  }

  const result = {
    action: userResult.action === 'existing' ? 'updated' : userResult.action,
    row_number: row.row_number,
    iin: row.normalized.iin,
    user_id: userResult.user.id,
    role: row.normalized.role.name
  };
  if (userResult.temporary_password) {
    result.temporary_password = userResult.temporary_password;
  }

  if (category === 'students') {
    const cls = await resolveClass(db, {
      normalized: row.normalized,
      schoolId,
      batchId,
      createMissing: options.create_missing_classes
    });
    const studentResult = await upsertStudent(db, {
      normalized: row.normalized,
      schoolId,
      userId: userResult.user.id,
      classId: cls.id,
      batchId,
      updateExisting: options.update_existing
    });
    await db.query('UPDATE users SET class_id = $1, updated_at = NOW() WHERE id = $2', [cls.id, userResult.user.id]);
    result.student_id = studentResult.student.id;
    result.class_id = cls.id;
    result.class_name = cls.name;
    if (studentResult.action === 'created') result.action = result.action === 'updated' ? 'updated' : 'created';
    if (studentResult.action === 'updated') result.action = 'updated';
    await maybeLinkStudentParent(db, { normalized: row.normalized, schoolId, studentId: studentResult.student.id });
  }

  if (category === 'staff' && TEACHER_PROFILE_ROLES.has(row.normalized.role.name)) {
    const teacherResult = await upsertTeacherProfile(db, {
      normalized: row.normalized,
      user: userResult.user,
      schoolId,
      batchId,
      updateExisting: options.update_existing
    });
    result.teacher_id = teacherResult.teacher.id;
    if (teacherResult.action === 'updated') result.action = 'updated';
  }

  if (category === 'staff' && ADMINISTRATION_PROFILE_ROLES.has(row.normalized.role.name)) {
    const adminResult = await upsertAdministrationProfile(db, {
      normalized: row.normalized,
      user: userResult.user,
      schoolId,
      batchId,
      updateExisting: options.update_existing
    });
    result.administration_id = adminResult.administration.id;
    if (adminResult.action === 'updated') result.action = 'updated';
  }

  if (category === 'administration' && ADMINISTRATION_PROFILE_ROLES.has(row.normalized.role.name)) {
    const adminResult = await upsertAdministrationProfile(db, {
      normalized: row.normalized,
      user: userResult.user,
      schoolId,
      batchId,
      updateExisting: options.update_existing
    });
    result.administration_id = adminResult.administration.id;
    if (adminResult.action === 'updated') result.action = 'updated';
  }

  if (category === 'parents') {
    const link = await linkParentToStudent(db, { normalized: row.normalized, user: userResult.user, schoolId });
    result.parent_student_link_id = link.id;
    result.student_id = link.student_id;
    if (row.action === 'link' || userResult.action === 'existing') result.action = 'updated';
  }

  return result;
}

function stripTemporaryPasswords(rowResults) {
  return rowResults.map(({ temporary_password, ...rest }) => rest);
}

async function confirmBatch({ batchId, schoolId, userId, options = {} }) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const batch = await loadBatch(batchId, schoolId, client);
    if (!batch) {
      const err = new Error('Импорт пакеті табылмады');
      err.status = 404;
      throw err;
    }
    if (batch.status === 'completed' || batch.status === 'completed_with_errors') {
      const err = new Error('Бұл импорт пакеті бұрын расталған');
      err.status = 409;
      throw err;
    }

    const validation = await validateRows({
      db: client,
      schoolId,
      category: batch.category,
      parsedRows: batch.parsed_rows || [],
      parseMeta: {},
      options: { ...(batch.options || {}), ...options }
    });

    const rowResults = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = validation.summary.errors;

    for (const row of validation.rows) {
      if (!row.valid) {
        skipped += 1;
        continue;
      }
      const savepoint = `import_row_${row.row_number}`;
      await client.query(`SAVEPOINT ${savepoint}`);
      try {
        const rowResult = await importValidatedRow(client, {
          row,
          category: batch.category,
          schoolId,
          batchId,
          options: validation.options
        });
        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
        rowResults.push(rowResult);
        if (rowResult.action === 'created') created += 1;
        else if (rowResult.action === 'updated') updated += 1;
        else skipped += 1;
      } catch (error) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
        errors += 1;
        rowResults.push({
          action: 'error',
          row_number: row.row_number,
          iin: row.normalized.iin,
          error: error.message
        });
      }
    }

    const storedResult = {
      confirmed_by: userId,
      confirmed_at: new Date().toISOString(),
      rows: stripTemporaryPasswords(rowResults)
    };
    const status = errors ? 'completed_with_errors' : 'completed';
    const updatedBatch = await client.query(
      `UPDATE user_import_batches SET
        status = $1,
        options = $2::jsonb,
        total_rows = $3,
        valid_rows = $4,
        invalid_rows = $5,
        created_count = $6,
        updated_count = $7,
        skipped_count = $8,
        error_count = $9,
        validation_errors = $10::jsonb,
        import_result = $11::jsonb,
        confirmed_at = NOW(),
        updated_at = NOW()
       WHERE id = $12 AND school_id = $13
       RETURNING *`,
      [
        status,
        JSON.stringify(validation.options),
        validation.summary.total_rows,
        validation.summary.valid_rows,
        validation.summary.invalid_rows,
        created,
        updated,
        skipped,
        errors,
        JSON.stringify(validation.issues),
        JSON.stringify(storedResult),
        batchId,
        schoolId
      ]
    );

    await client.query('COMMIT');

    return {
      batch: updatedBatch.rows[0],
      summary: {
        created,
        updated,
        skipped,
        errors,
        total_rows: validation.summary.total_rows
      },
      validation: publicValidation(validation),
      result_rows: rowResults,
      temporary_credentials: rowResults
        .filter((row) => row.temporary_password)
        .map((row) => ({
          row_number: row.row_number,
          iin: row.iin,
          user_id: row.user_id,
          role: row.role,
          temporary_password: row.temporary_password
        }))
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function history({ schoolId, page = 1, limit = 20 }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;
  const [rows, count] = await Promise.all([
    query(
      `SELECT b.id, b.school_id, b.category, b.status, b.original_filename,
              b.total_rows, b.valid_rows, b.invalid_rows, b.created_count,
              b.updated_count, b.skipped_count, b.error_count, b.created_at,
              b.validated_at, b.confirmed_at, u.full_name AS uploaded_by_name
       FROM user_import_batches b
       LEFT JOIN users u ON u.id = b.uploaded_by
       WHERE b.school_id = $1
       ORDER BY b.created_at DESC
       LIMIT $2 OFFSET $3`,
      [schoolId, limitNum, offset]
    ),
    query('SELECT COUNT(*)::int AS total FROM user_import_batches WHERE school_id = $1', [schoolId])
  ]);
  return {
    data: rows.rows,
    pagination: {
      total: count.rows[0].total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(count.rows[0].total / limitNum)
    }
  };
}

async function details({ batchId, schoolId }) {
  const batch = await loadBatch(batchId, schoolId);
  if (!batch) {
    const err = new Error('Импорт пакеті табылмады');
    err.status = 404;
    throw err;
  }
  const validation = await validateRows({
    db: { query },
    schoolId,
    category: batch.category,
    parsedRows: batch.parsed_rows || [],
    parseMeta: {},
    options: batch.options || {}
  });
  return {
    batch,
    validation: publicValidation(validation),
    result: batch.import_result || {}
  };
}

module.exports = {
  confirmBatch,
  createBatchFromUpload,
  details,
  history,
  listCategories,
  templateBuffer,
  validateBatch
};
