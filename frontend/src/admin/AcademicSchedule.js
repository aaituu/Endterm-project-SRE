import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

const AcademicSchedule = () => {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genOpen, setGenOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [genResult, setGenResult] = useState(null);
  const [gen, setGen] = useState({
    academic_year: '2025-2026',
    lessons_per_day: 7,
    schedule_type: 'daytime',
    clear_existing: true
  });

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await api.academic.schedule.summary();
    if (res.success) setSummary(res.data || []);
    setLoading(false);
  };

  const runGenerate = async () => {
    setGenerating(true);
    const res = await api.academic.schedule.generate({
      academic_year: gen.academic_year,
      schedule_type: gen.schedule_type,
      clear_existing: gen.clear_existing,
      lessons_per_day: gen.lessons_per_day
    });
    setGenerating(false);
    if (res.success) {
      setGenOpen(false);
      setGenResult({ message: res.message || 'Дайын', data: res.data || null });
      await load();
    } else {
      setGenResult({ error: res.message || 'Қате' });
    }
  };

  const showTeachersSchedule = async () => {
    setActionLoading('teachers');
    const res = await api.academic.schedule.teachers();
    setActionLoading('');
    if (res.success) {
      const teachers = res.data?.teachers || [];
      setGenResult({
        type: 'teachers',
        title: 'Мұғалімдердің кестесі',
        message: `${teachers.length} мұғалім табылды`,
        data: res.data
      });
    } else {
      setGenResult({ error: res.message || 'Мұғалімдер кестесін алу мүмкін болмады' });
    }
  };

  const checkSchedule = async () => {
    setActionLoading('validate');
    const res = await api.academic.schedule.validate();
    setActionLoading('');
    if (res.success) {
      setGenResult({
        type: 'validation',
        title: 'Кестені тексеру',
        message: res.message || 'Кесте тексерілді',
        data: res.data
      });
    } else {
      setGenResult({ error: res.message || 'Кестені тексеру мүмкін болмады' });
    }
  };

  const exportSchedule = async (shift, withTeachers = false) => {
    const key = `${shift}-${withTeachers ? 'teachers' : 'plain'}`;
    setActionLoading(key);
    const res = await api.academic.schedule.exportCsv(shift, withTeachers);
    setActionLoading('');
    if (res.success) {
      setGenResult({
        type: 'export',
        title: 'Экспорт дайын',
        message: `${shift === 'daytime' ? '1 ауысым' : '2 ауысым'} кестесі CSV ретінде жүктелді${withTeachers ? ' (мұғалімдермен)' : ''}`
      });
    } else {
      setGenResult({ error: res.message || 'Экспорт жасау мүмкін болмады' });
    }
  };

  const renderResultDetails = () => {
    if (!genResult?.data) return null;

    if (genResult.type === 'teachers') {
      const teachers = genResult.data.teachers || [];
      return (
        <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
          {teachers.slice(0, 12).map((teacher) => (
            <div key={teacher.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '10px 12px', border: '1px solid #1f2937', borderRadius: 8, background: '#020617' }}>
              <div>
                <strong>{teacher.full_name}</strong>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{teacher.class_names || 'Сынып байланысы жоқ'}</div>
              </div>
              <span style={{ color: '#cbd5e1', fontWeight: 700 }}>{teacher.lesson_count || 0} сабақ</span>
            </div>
          ))}
          {teachers.length > 12 && <p style={{ margin: 0, color: '#94a3b8' }}>Тағы {teachers.length - 12} мұғалім бар.</p>}
        </div>
      );
    }

    if (genResult.type === 'validation') {
      const issues = genResult.data.issues || [];
      return (
        <div style={{ marginTop: 14 }}>
          {issues.length ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {issues.slice(0, 12).map((issue, index) => (
                <div key={`${issue.type}-${index}`} style={{ padding: '10px 12px', border: `1px solid ${issue.severity === 'error' ? '#7f1d1d' : '#854d0e'}`, borderRadius: 8, background: issue.severity === 'error' ? 'rgba(127, 29, 29, 0.25)' : 'rgba(133, 77, 14, 0.22)', color: '#f8fafc' }}>
                  {issue.message}
                </div>
              ))}
              {issues.length > 12 && <p style={{ margin: 0, color: '#94a3b8' }}>Тағы {issues.length - 12} мәселе бар.</p>}
            </div>
          ) : (
            <p style={{ margin: 0, color: '#bbf7d0' }}>Қабаттасу және бос сыныптар табылмады.</p>
          )}
        </div>
      );
    }

    return (
      <p style={{ margin: '8px 0 0', color: '#94a3b8' }}>
        Сыныптар: {genResult.data.classes_count || 0} · Мұғалімдер: {genResult.data.teachers_count || 0} · Сабақтар: {genResult.data.created_count || 0}
      </p>
    );
  };

  const totalClasses = summary.length;
  const withSchedule = summary.filter((r) => (parseInt(r.lesson_count, 10) || 0) > 0).length;
  const totalLessons = summary.reduce((a, r) => a + (parseInt(r.lesson_count, 10) || 0), 0);

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Кесте басқару</h1>
          <p className="ap-page-sub">Мектеп кестесін құру және басқару</p>
        </div>
      </div>

      <div className="ap-schedule-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <button type="button" className="btn" disabled={!!actionLoading} style={{ background: '#7c3aed', color: '#fff', border: 'none' }} onClick={showTeachersSchedule}>{actionLoading === 'teachers' ? 'Жүктелуде...' : 'Мұғалімдердің кестесі'}</button>
        <button type="button" className="btn" disabled={!!actionLoading} style={{ background: '#2563eb', color: '#fff', border: 'none' }} onClick={checkSchedule}>{actionLoading === 'validate' ? 'Тексерілуде...' : 'Кестені тексеру'}</button>
        <button type="button" className="btn" disabled={!!actionLoading} style={{ background: '#38bdf8', color: '#f8fafc', border: 'none' }} onClick={() => exportSchedule('daytime')}>{actionLoading === 'daytime-plain' ? 'Экспорт...' : '1 ауысым Экспорт'}</button>
        <button type="button" className="btn" disabled={!!actionLoading} style={{ background: '#1d4ed8', color: '#fff', border: 'none' }} onClick={() => exportSchedule('daytime', true)}>{actionLoading === 'daytime-teachers' ? 'Экспорт...' : '1 ауысым Экспорт мұғалімдермен'}</button>
        <button type="button" className="btn" disabled={!!actionLoading} style={{ background: '#6366f1', color: '#fff', border: 'none' }} onClick={() => exportSchedule('evening')}>{actionLoading === 'evening-plain' ? 'Экспорт...' : '2 ауысым Экспорт'}</button>
        <button type="button" className="btn" disabled={!!actionLoading} style={{ background: '#4c1d95', color: '#fff', border: 'none' }} onClick={() => exportSchedule('evening', true)}>{actionLoading === 'evening-teachers' ? 'Экспорт...' : '2 ауысым Экспорт мұғалімдермен'}</button>
        <button type="button" className="btn btn-success" onClick={() => setGenOpen(true)}><i className="fas fa-plus"></i> Кесте құру</button>
      </div>

      {genResult && (
        <div className="data-card" style={{ marginBottom: 20, borderColor: genResult.error ? '#7f1d1d' : '#14532d' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: '0 0 8px' }}>{genResult.error ? 'Әрекет қатесі' : (genResult.title || 'Генерация нәтижесі')}</h3>
              <p style={{ margin: 0, color: genResult.error ? '#fecaca' : '#bbf7d0' }}>
                {genResult.error || genResult.message}
              </p>
              {renderResultDetails()}
            </div>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setGenResult(null)}>Жабу</button>
          </div>
        </div>
      )}

      <div className="ap-stat-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-briefcase"></i></div>
          <div>
            <div className="stat-label">Барлық сыныптар</div>
            <div className="stat-value">{totalClasses}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#16a34a' }}><i className="fas fa-check-circle"></i></div>
          <div>
            <div className="stat-label">Кестені бар сыныптар</div>
            <div className="stat-value">{withSchedule}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-book-open"></i></div>
          <div>
            <div className="stat-label">Барлық сабақтар</div>
            <div className="stat-value">{totalLessons}</div>
          </div>
        </div>
      </div>

      <div className="data-table-card">
        <h3 style={{ padding: '16px 20px 0', margin: 0 }}>Сыныптар</h3>
        <p style={{ padding: '4px 20px 16px', margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Әр сынып үшін кестені көру</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Сынып</th>
                <th>Ақпарат</th>
                <th>Күй</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4"><i className="fas fa-spinner fa-spin"></i></td></tr>
              ) : summary.length ? summary.map((c) => {
                const lc = parseInt(c.lesson_count, 10) || 0;
                const sc = parseInt(c.student_count, 10) || 0;
                const has = lc > 0;
                return (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td style={{ color: '#64748b', fontSize: '0.9rem' }}>
                      Кестедегі сабақтар: {lc} | Оқушылар: {sc}
                    </td>
                    <td>
                      {has ? <span className="badge badge-green">Кесте бар</span> : <span className="badge">Кесте жоқ</span>}
                    </td>
                    <td>
                      <Link to={`/admin/academic/schedule/${c.id}`} className="btn btn-sm" style={{ background: '#e0f2fe', color: '#0369a1', border: 'none' }}>Көру</Link>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="4" style={{ color: '#94a3b8' }}>Сыныптар табылмады. Алдымен сынып, пән және мұғалім қосыңыз.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {genOpen && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && setGenOpen(false)}>
          <div
            className="modal"
            style={{
              maxWidth: 440,
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#e5e7eb',
              boxShadow: '0 24px 80px rgba(0,0,0,.45)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-body" style={{ padding: 24 }}>
              <h3 style={{ marginTop: 0, color: '#f8fafc' }}>Кесте генерациясы</h3>
              <div className="form-group">
                <label className="ap-form-label" style={{ color: '#cbd5e1' }}>Оқу жылы</label>
                <input className="ap-input" value={gen.academic_year} onChange={(e) => setGen({ ...gen, academic_year: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="ap-form-label" style={{ color: '#cbd5e1' }}>Күніне сабақ саны</label>
                <select className="ap-input" value={gen.lessons_per_day} onChange={(e) => setGen({ ...gen, lessons_per_day: Number(e.target.value) })}>
                  {[5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} сабақ</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="ap-form-label" style={{ color: '#cbd5e1' }}>Кесте түрі</label>
                <select className="ap-input" value={gen.schedule_type} onChange={(e) => setGen({ ...gen, schedule_type: e.target.value })}>
                  <option value="daytime">Күндізгі</option>
                  <option value="evening">Кешкі</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e5e7eb' }}>
                  <input type="checkbox" checked={gen.clear_existing} onChange={(e) => setGen({ ...gen, clear_existing: e.target.checked })} />
                  Бар кестені өшіру
                </label>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setGenOpen(false)} disabled={generating}>Бас тарту</button>
                <button type="button" className="btn btn-success" onClick={runGenerate} disabled={generating}>
                  {generating ? 'Генерация...' : 'Генерациялау'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

export default AcademicSchedule;
