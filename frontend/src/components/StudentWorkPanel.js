import React, { useEffect, useMemo, useState } from 'react';

const WORK_SECTION_CONFIG = {
  'Тәрбиешің ұяшығы': {
    icon: 'fas fa-user-check',
    tone: 'teal',
    title: 'Тәрбиешің ұяшығы',
    subtitle: 'Сыныптағы оқушылардың бүгінгі қатысуын және қысқа ескертпесін белгілеу',
    classHint: 'Қатысу журналы'
  },
  'Оқушы мамандығы': {
    icon: 'fas fa-compass',
    tone: 'violet',
    title: 'Оқушы мамандығы',
    subtitle: 'Оқушының кәсіби бағытын, таңдаған саласын немесе қызығушылығын сақтау',
    classHint: 'Бағыт енгізу'
  },
  'Дарынды оқушылар': {
    icon: 'fas fa-award',
    tone: 'amber',
    title: 'Дарынды оқушылар',
    subtitle: 'Дарын бағытын, қолдау түрін және жеке бақылау жазбасын жүргізу',
    classHint: 'Профиль жүргізу'
  }
};

const profileTypeLabel = (type) => {
  if (type === 'gifted') return 'Дарынды';
  if (type === 'struggling') return 'Қолдау қажет';
  return type || 'Профиль жоқ';
};

const initials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || 'О') + (parts[1]?.[0] || '');
};

const classStudentCount = (item) => item?.student_count || item?.students_count || item?.count || null;

const attendanceLabels = {
  present: { label: 'Қатысты', icon: 'fas fa-check', className: 'present' },
  late: { label: 'Кешіккен', icon: 'fas fa-clock', className: 'late' },
  absent: { label: 'Келмеген', icon: 'fas fa-user-times', className: 'absent' },
  excused: { label: 'Себепті', icon: 'fas fa-file-signature', className: 'excused' }
};

const StudentWorkPanel = ({
  section,
  classes = [],
  selectedClass = null,
  students = [],
  profiles = [],
  loading = false,
  embedded = false,
  onSelectClass,
  onBack,
  onSaveProfession,
  onMarkAttendance,
  onSaveProfile
}) => {
  const config = WORK_SECTION_CONFIG[section] || WORK_SECTION_CONFIG['Оқушы мамандығы'];
  const [professionDrafts, setProfessionDrafts] = useState({});
  const [reasonDrafts, setReasonDrafts] = useState({});
  const [profileDrafts, setProfileDrafts] = useState({});

  const profileMap = useMemo(() => {
    const map = {};
    profiles.forEach((profile) => {
      map[String(profile.student_id)] = profile;
    });
    return map;
  }, [profiles]);

  const attendanceGroups = useMemo(() => {
    const groups = { absent: [], late: [], present: [], excused: [], unmarked: [] };
    students.forEach((student) => {
      const status = student.attendance_status || 'unmarked';
      if (groups[status]) groups[status].push(student);
      else groups.unmarked.push(student);
    });
    return groups;
  }, [students]);

  useEffect(() => {
    const next = {};
    students.forEach((student) => {
      next[student.id] = student.profession || '';
    });
    setProfessionDrafts(next);
  }, [students]);

  useEffect(() => {
    const next = {};
    students.forEach((student) => {
      next[student.id] = profileMap[String(student.id)]?.notes || '';
    });
    setProfileDrafts(next);
  }, [students, profileMap]);

  useEffect(() => {
    if (section !== 'Тәрбиешің ұяшығы') return;
    const next = {};
    students.forEach((student) => {
      next[student.id] = student.attendance_reason || '';
    });
    setReasonDrafts(next);
  }, [students, section]);

  const shellClass = embedded ? 'student-work-shell embedded' : 'student-work-shell';

  const renderHeader = () => (
    <div className={`student-work-hero tone-${config.tone}`}>
      <div className="student-work-hero-icon">
        <i className={config.icon}></i>
      </div>
      <div className="student-work-hero-copy">
        <p>{selectedClass ? selectedClass.name : 'Сынып таңдау'}</p>
        <h2>{selectedClass ? config.title : config.title}</h2>
        <span>{selectedClass ? `${students.length} оқушы` : config.subtitle}</span>
      </div>
      {selectedClass && (
        <button className="student-work-back" onClick={onBack} type="button">
          <i className="fas fa-arrow-left"></i>
          Артқа
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={shellClass}>
        {renderHeader()}
        <div className="student-work-loading">
          <i className="fas fa-spinner fa-spin"></i>
          Жүктелуде...
        </div>
      </div>
    );
  }

  if (!selectedClass) {
    return (
      <div className={shellClass}>
        {renderHeader()}
        <div className="student-work-class-grid">
          {classes.map((item, index) => {
            const count = classStudentCount(item);
            return (
              <button
                key={item.id}
                className={`student-work-class-card tone-${config.tone}`}
                onClick={() => onSelectClass?.(item, section)}
                style={{ animationDelay: `${Math.min(index * 35, 280)}ms` }}
                type="button"
              >
                <span className="student-work-class-icon">
                  <i className={config.icon}></i>
                </span>
                <strong>{item.name}</strong>
                <small>{config.classHint}</small>
                <span className="student-work-class-footer">
                  {count ? `${count} оқушы` : 'Оқушыларды ашу'}
                  <i className="fas fa-arrow-right"></i>
                </span>
              </button>
            );
          })}
        </div>
        {!classes.length && (
          <div className="student-work-empty">
            <i className="fas fa-layer-group"></i>
            <span>Сыныптар табылмады</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={shellClass}>
      {renderHeader()}
      <div className="student-work-student-grid">
        {students.map((student, index) => {
          const profile = profileMap[String(student.id)];
          const profileNotes = profileDrafts[student.id] || '';
          const reason = reasonDrafts[student.id] || '';
          const attendance = attendanceLabels[student.attendance_status] || null;
          return (
            <article
              key={student.id}
              className="student-work-student-card"
              style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
            >
              <div className="student-work-student-top">
                <div className={`student-work-avatar tone-${config.tone}`}>{initials(student.full_name)}</div>
                <div>
                  <h3>{student.full_name}</h3>
                  <p>{student.iin || selectedClass.name || 'Оқушы'}</p>
                </div>
                {section === 'Тәрбиешің ұяшығы' && (
                  <span className={`student-work-attendance-chip ${attendance?.className || 'unmarked'}`}>
                    {attendance ? <i className={attendance.icon}></i> : <i className="fas fa-minus"></i>}
                    {attendance?.label || 'Белгі жоқ'}
                  </span>
                )}
              </div>

              {section === 'Оқушы мамандығы' && (
                <div className="student-work-form-block">
                  <label>Мамандық бағыты</label>
                  <div className="student-work-inline">
                    <input
                      value={professionDrafts[student.id] || ''}
                      onChange={(event) => setProfessionDrafts((prev) => ({ ...prev, [student.id]: event.target.value }))}
                      placeholder="Мысалы: IT, медицина, инженерия"
                    />
                    <button
                      className="student-work-btn primary"
                      onClick={() => onSaveProfession?.(student, professionDrafts[student.id] || '')}
                      type="button"
                    >
                      <i className="fas fa-save"></i>
                    </button>
                  </div>
                </div>
              )}

              {section === 'Тәрбиешің ұяшығы' && (
                <div className="student-work-form-block">
                  <label>Қатысу белгісі</label>
                  <input
                    value={reason}
                    onChange={(event) => setReasonDrafts((prev) => ({ ...prev, [student.id]: event.target.value }))}
                    placeholder="Себеп немесе қысқа ескерту"
                  />
                  {student.attendance_reason && (
                    <div className="student-work-reason-note">
                      <i className="fas fa-comment-alt"></i>
                      {student.attendance_reason}
                    </div>
                  )}
                  <div className="student-work-actions">
                    <button className="student-work-btn success" onClick={() => onMarkAttendance?.(student, 'present', reason)} type="button">
                      <i className="fas fa-check"></i>
                      Қатысты
                    </button>
                    <button className="student-work-btn warning" onClick={() => onMarkAttendance?.(student, 'late', reason)} type="button">
                      <i className="fas fa-clock"></i>
                      Кешіккен
                    </button>
                    <button className="student-work-btn danger" onClick={() => onMarkAttendance?.(student, 'absent', reason)} type="button">
                      <i className="fas fa-user-times"></i>
                      Келмеген
                    </button>
                  </div>
                </div>
              )}

              {section === 'Дарынды оқушылар' && (
                <div className="student-work-form-block">
                  <div className="student-work-profile-line">
                    <span className={`student-work-chip ${profile?.profile_type || 'empty'}`}>
                      {profileTypeLabel(profile?.profile_type)}
                    </span>
                  </div>
                  <label>Бағыт және бақылау жазбасы</label>
                  <textarea
                    value={profileNotes}
                    onChange={(event) => setProfileDrafts((prev) => ({ ...prev, [student.id]: event.target.value }))}
                    placeholder="Пәні, жобасы, олимпиада бағыты немесе қолдау жоспары"
                    rows={3}
                  />
                  <div className="student-work-actions">
                    <button className="student-work-btn primary" onClick={() => onSaveProfile?.(student, 'gifted', profileNotes)} type="button">
                      <i className="fas fa-award"></i>
                      Дарынды
                    </button>
                    <button className="student-work-btn neutral" onClick={() => onSaveProfile?.(student, 'struggling', profileNotes)} type="button">
                      <i className="fas fa-hands-helping"></i>
                      Қолдау
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {!students.length && (
        <div className="student-work-empty">
          <i className="fas fa-users"></i>
          <span>Бұл сыныпта оқушылар табылмады</span>
        </div>
      )}
      {section === 'Тәрбиешің ұяшығы' && !!students.length && (
        <div className="student-work-attendance-board">
          {[
            { key: 'absent', title: 'Келмеген оқушылар', icon: 'fas fa-user-times' },
            { key: 'late', title: 'Кешіккен оқушылар', icon: 'fas fa-clock' },
            { key: 'present', title: 'Қатысқан оқушылар', icon: 'fas fa-check' }
          ].map((group) => (
            <div key={group.key} className={`student-work-attendance-list ${group.key}`}>
              <div className="student-work-attendance-list-head">
                <span><i className={group.icon}></i> {group.title}</span>
                <strong>{attendanceGroups[group.key].length}</strong>
              </div>
              {attendanceGroups[group.key].length ? (
                <div className="student-work-attendance-names">
                  {attendanceGroups[group.key].map((student) => (
                    <span key={student.id}>
                      {student.full_name}
                      {student.attendance_reason ? <small>{student.attendance_reason}</small> : null}
                    </span>
                  ))}
                </div>
              ) : (
                <p>Бұл тізім бос</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { WORK_SECTION_CONFIG };
export default StudentWorkPanel;
