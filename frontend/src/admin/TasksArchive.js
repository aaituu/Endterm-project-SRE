import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

function stripHtml(s) {
  if (!s) return '';
  return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function priLabel(p) {
  return ({ low: 'Төмен', medium: 'Орташа', high: 'Жоғары' }[p] || p || '—');
}

function wfLabel(w) {
  return ({ not_started: 'Күтілуде', in_progress: 'Орындалуда', completed: 'Орындалды' }[w] || w || '—');
}

const TasksArchive = () => {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ completed: 0, in_progress: 0, overdue: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const q = new URLSearchParams({ archived: 'true', limit: '200' }).toString();
    const [lRes, sRes] = await Promise.all([
      api.tasks.list(q),
      api.tasks.stats('archived=true')
    ]);
    if (lRes.success) setRows(lRes.data || []);
    if (sRes.success) setStats(sRes.data || stats);
    setLoading(false);
  };

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Архивтелген тапсырмалар</h1>
          <p className="ap-page-sub">Белсенді емес тапсырмалар тізімі</p>
        </div>
        <Link to="/admin/tasks" className="btn btn-secondary">Белсенді тапсырмалар</Link>
      </div>

      <div className="ap-stat-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="stat-card" style={{ padding: 14, textAlign: 'left' }}><div style={{ color: '#16a34a' }}>Орындалған</div><strong style={{ fontSize: '1.4rem' }}>{stats.completed}</strong></div>
        <div className="stat-card" style={{ padding: 14, textAlign: 'left' }}><div style={{ color: '#ca8a04' }}>Қаралған</div><strong style={{ fontSize: '1.4rem' }}>0</strong></div>
        <div className="stat-card" style={{ padding: 14, textAlign: 'left' }}><div style={{ color: '#dc2626' }}>Мерзімі өтті</div><strong style={{ fontSize: '1.4rem' }}>{stats.overdue}</strong></div>
        <div className="stat-card" style={{ padding: 14, textAlign: 'left' }}><div style={{ color: '#2563eb' }}>Барлығы</div><strong style={{ fontSize: '1.4rem' }}>{stats.total}</strong></div>
      </div>

      <div className="form-panel" style={{ background: '#fef9c3', border: '1px solid #fde047', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          <i className="fas fa-info-circle" style={{ color: '#ca8a04', marginRight: 8 }}></i>
          Ескерту: Бұл бетте архивтелген тапсырмалар көрсетілген. Олар мұғалім тақтасында белсенді тізімде көрінбейді.
        </p>
      </div>

      <div className="data-table-card">
        <div style={{ padding: '12px 16px' }}><strong>Архивтелген тапсырмалар тізімі</strong></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Тапсырма</th>
                <th>Мұғалім</th>
                <th>Приоритет</th>
                <th>Мерзімі</th>
                <th>Соңғы статус</th>
                <th>Архивке</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6"><i className="fas fa-spinner fa-spin"></i></td></tr>
              ) : rows.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.title}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{stripHtml(t.description)}</div>
                  </td>
                  <td>
                    <strong>{t.teacher_name || '—'}</strong>
                    {t.assigned_by_name && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{t.assigned_by_name} тағайындаған</div>}
                  </td>
                  <td><span className="badge badge-amber">{priLabel(t.priority)}</span></td>
                  <td>{t.deadline ? new Date(t.deadline).toLocaleString('kk-KZ', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                  <td><span className="badge badge-green">{wfLabel(t.workflow_status)}</span></td>
                  <td>{t.archived_at ? new Date(t.archived_at).toLocaleDateString('kk-KZ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
};

export default TasksArchive;
