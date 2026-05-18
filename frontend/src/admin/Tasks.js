import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

function stripHtml(s) {
  if (!s) return '';
  return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
}

function priLabel(p) {
  return ({ low: 'Төмен', medium: 'Орташа', high: 'Жоғары' }[p] || p || '—');
}

function wfLabel(w) {
  return ({ not_started: 'Күтілуде', in_progress: 'Орындалуда', completed: 'Орындалды' }[w] || w || '—');
}

function wfBadgeClass(w) {
  if (w === 'completed') return 'badge-green';
  if (w === 'in_progress') return 'badge-amber';
  return 'badge-blue';
}

function priBadgeClass(p) {
  if (p === 'high') return 'badge-red';
  if (p === 'low') return 'badge-blue';
  return 'badge-amber';
}

const Tasks = () => {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ completed: 0, in_progress: 0, overdue: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const q = new URLSearchParams({ archived: 'false', limit: '200', search: search.trim() }).toString();
    const [lRes, sRes] = await Promise.all([
      api.tasks.list(q),
      api.tasks.stats('archived=false')
    ]);
    if (lRes.success) setRows(lRes.data || []);
    if (sRes.success) setStats(sRes.data || stats);
    setLoading(false);
  };

  const exportCompletedCsv = () => {
    const done = rows.filter((t) => t.workflow_status === 'completed');
    const header = ['id', 'title', 'teacher', 'deadline', 'priority'];
    const lines = [header.join(';'), ...done.map((t) => [t.id, `"${(t.title || '').replace(/"/g, '""')}"`, t.teacher_name || '', t.deadline || '', t.priority || ''].join(';'))];
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tasks_completed_${Date.now()}.csv`;
    a.click();
  };

  const exportWord = (t) => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t.title}</title></head><body><h1>${t.title}</h1>${t.description || ''}</body></html>`;
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `task_${t.id}.doc`;
    a.click();
  };

  const archiveOne = async (id) => {
    const res = await api.tasks.update(id, { is_archived: true });
    if (res.success) load();
    else alert(res.message || 'Қате');
  };

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Тапсырмалар басқару</h1>
          <p className="ap-page-sub">Мұғалімдерге арналған тапсырмаларды басқару</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button type="button" className="btn btn-success" onClick={exportCompletedCsv}>
            Орындалған тапсырмаларды жүктеу ({stats.completed})
          </button>
          <Link to="/admin/tasks/archive" className="btn btn-secondary">Архив <i className="fas fa-chevron-down" style={{ fontSize: '0.65rem', marginLeft: 4 }}></i></Link>
          <Link to="/admin/tasks/new" className="btn btn-primary">+ Жаңа тапсырма қосу</Link>
        </div>
      </div>

      <div className="ap-stat-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="stat-card" style={{ padding: '16px 20px', textAlign: 'left' }}>
          <div style={{ color: '#16a34a', fontWeight: 700 }}>Орындалған</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.completed}</div>
        </div>
        <div className="stat-card" style={{ padding: '16px 20px', textAlign: 'left' }}>
          <div style={{ color: '#ca8a04', fontWeight: 700 }}>Орындалуда</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.in_progress}</div>
        </div>
        <div className="stat-card" style={{ padding: '16px 20px', textAlign: 'left' }}>
          <div style={{ color: '#dc2626', fontWeight: 700 }}>Мерзімі өтті</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.overdue}</div>
        </div>
        <div className="stat-card" style={{ padding: '16px 20px', textAlign: 'left' }}>
          <div style={{ color: '#2563eb', fontWeight: 700 }}>Барлығы</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.total}</div>
        </div>
      </div>

      <div className="data-table-card">
        <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <strong>Тапсырмалар тізімі</strong>
          <input className="ap-input" style={{ maxWidth: 280 }} placeholder="ID, ФИО, тақырып..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          <button type="button" className="btn btn-primary" onClick={load}>Іздеу</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Тапсырма</th>
                <th>Мұғалім</th>
                <th>Приоритет</th>
                <th>Мерзімі</th>
                <th>Статус</th>
                <th>Әрекеттер</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6"><i className="fas fa-spinner fa-spin"></i></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: '#64748b' }}>Тапсырмалар жоқ</td></tr>
              ) : rows.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.title}</strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>{stripHtml(t.description)}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.teacher_name || '—'}</div>
                    {t.assigned_by_name && (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t.assigned_by_name} тағайындаған</div>
                    )}
                  </td>
                  <td><span className={`badge ${priBadgeClass(t.priority)}`}>{priLabel(t.priority)}</span></td>
                  <td>{t.deadline ? new Date(t.deadline).toLocaleString('kk-KZ', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                  <td><span className={`badge ${wfBadgeClass(t.workflow_status)}`}>{wfLabel(t.workflow_status)}</span></td>
                  <td>
                    <Link to={`/admin/tasks/${t.id}/edit`} style={{ color: '#2563eb', fontWeight: 600, marginRight: 8 }}>Көру</Link>
                    <Link to={`/admin/tasks/${t.id}/edit`} style={{ color: '#16a34a', fontWeight: 600, marginRight: 8 }}>Өзгерту</Link>
                    <button type="button" style={{ color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => exportWord(t)}>Word</button>
                    <button type="button" style={{ color: '#64748b', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }} onClick={() => archiveOne(t.id)}>Архив</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
};

export default Tasks;
