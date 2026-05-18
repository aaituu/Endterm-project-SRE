import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

const dayLabels = ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб'];

const Dashboard = () => {
  const [stats, setStats] = useState({
    news_count: 0,
    news_published: 0,
    users_count: 0,
    users_today: 0,
    total_views: 0,
    avg_views: 0,
    late_today: 0,
    latest_news: [],
    weekly_stats: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.stats.dashboard();
        if (res.success && res.data) setStats(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('kk-KZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const nowStr = new Date().toLocaleString('kk-KZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const weeklyMerged = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const row = (stats.weekly_stats || []).find((r) => {
      const rk = new Date(r.d).toISOString().split('T')[0];
      return rk === key;
    });
    weeklyMerged.push({
      label: dayLabels[d.getDay()],
      date: d,
      news: row ? parseInt(row.news_cnt, 10) : 0,
      views: row ? parseInt(row.views_sum, 10) : 0
    });
  }

  return (
    <AdminShell>
      <h1 className="ap-page-title">Басты бет</h1>
      <p className="ap-page-sub">Әкімшілік панеліне қош келдіңіз</p>
      <p className="ap-page-meta">Соңғы жаңарту: {nowStr}</p>

      <div className="ap-dash-actions">
        <Link to="/admin/slides" className="ap-dash-action-card">
          <div className="icon"><i className="fas fa-images"></i></div>
          <div>
            <h3>Басты слайдтар</h3>
            <p>Негізгі баннерлерді басқару</p>
          </div>
        </Link>
        <Link to="/admin/news" className="ap-dash-action-card">
          <div className="icon"><i className="fas fa-newspaper"></i></div>
          <div>
            <h3>Жаңалықтар</h3>
            <p>Жариялау және модерация</p>
          </div>
        </Link>
        <Link to="/administration" className="ap-dash-action-card">
          <div className="icon"><i className="fas fa-users-cog"></i></div>
          <div>
            <h3>Мектеп басқармасы</h3>
            <p>Әкімшілік құрам</p>
          </div>
        </Link>
      </div>

      <div className="dashboard-stat-grid" style={{ marginBottom: 24 }}>
        <div className="dash-stat-card blue">
          <div className="dash-stat-icon"><i className="fas fa-newspaper"></i></div>
          <div className="dash-stat-num">{loading ? '—' : stats.news_count}</div>
          <div className="dash-stat-label">Барлық жаңалықтар</div>
          <div className="ap-stat-sub">{stats.news_published != null ? `${stats.news_published} жарияланған` : ''}</div>
        </div>
        <div className="dash-stat-card green">
          <div className="dash-stat-icon"><i className="fas fa-users"></i></div>
          <div className="dash-stat-num">{loading ? '—' : stats.users_count}</div>
          <div className="dash-stat-label">Пайдаланушылар</div>
          <div className="ap-stat-sub ok">
            {stats.users_today != null ? `+${stats.users_today} бүгін` : ''}
          </div>
        </div>
        <div className="dash-stat-card amber">
          <div className="dash-stat-icon"><i className="fas fa-eye"></i></div>
          <div className="dash-stat-num">{loading ? '—' : stats.total_views}</div>
          <div className="dash-stat-label">Барлық көрулер</div>
          <div className="ap-stat-sub">{stats.avg_views != null ? `${stats.avg_views} орташа` : ''}</div>
        </div>
        <div className="dash-stat-card red">
          <div className="dash-stat-icon"><i className="fas fa-user-clock"></i></div>
          <div className="dash-stat-num">{loading ? '—' : stats.late_today}</div>
          <div className="dash-stat-label">Кешіккен оқушылар</div>
          <div className="ap-stat-sub ok">{stats.late_today === 0 ? 'Барлығы уақытында' : ''}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="dash-bottom-grid">
        <div className="data-table-card">
          <div className="data-table-header">
            <h3>Апталық статистика</h3>
          </div>
          <div style={{ padding: 16 }}>
            {weeklyMerged.map((w, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border)'
                }}
              >
                <span style={{ fontWeight: 600, color: '#94a3b8' }}>
                  {w.label} <span style={{ fontWeight: 400, color: '#94a3b8' }}>{w.date.getDate()} {w.date.toLocaleDateString('kk-KZ', { month: 'short' })}</span>
                </span>
                <span style={{ color: '#64748b', fontSize: '0.88rem' }}>
                  {w.news} жаңалық, {w.views} көру
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="data-table-card">
          <div className="data-table-header">
            <h3>Соңғы жаңалықтар</h3>
            <Link to="/admin/news" className="btn btn-primary btn-sm">Барлық жаңалықтар →</Link>
          </div>
          <div className="table-wrap">
            <table>
              <tbody>
                {loading ? (
                  <tr><td><i className="fas fa-spinner fa-spin"></i></td></tr>
                ) : (stats.latest_news || []).slice(0, 6).map((n) => (
                  <tr key={n.id}>
                    <td style={{ maxWidth: 280 }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{formatDate(n.date)}</div>
                      <div className="td-name">{n.title}</div>
                      <div style={{ marginTop: 8 }}>
                        {n.status === 'approved' && (
                          <span className="badge badge-green" style={{ marginRight: 6 }}>Жарияланған</span>
                        )}
                        {n.recommended && <span className="badge badge-amber">Ұсынылған</span>}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.82rem' }}>
                      {n.views || 0} көру
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

export default Dashboard;
