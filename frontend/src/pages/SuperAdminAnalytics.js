import React, { useEffect, useState } from 'react';
import SuperAdminShell from '../components/SuperAdminShell.js';
import api, { showToast } from '../utils/api.js';

export default function SuperAdminAnalytics() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await api.superAdmin.analytics();
      if (res.success) {
        setOverview(res.data || {});
      } else {
        showToast(res.message || 'Аналитика жүктелмеді', 'error');
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <SuperAdminShell>
      <div className="ap-page-head">
        <div>
          <h1 className="ap-page-title">Аналитика</h1>
          <p className="ap-page-sub">Жүйелік мәліметтер мен әсерлі көрсеткіштер</p>
        </div>
      </div>

      {loading ? (
        <p>Жүктелуде...</p>
      ) : (
        <>
          <div className="ap-grid-4" style={{ gap: 18 }}>
            <div className="data-card">
              <h3>Барлық мектептер</h3>
              <p className="data-card-number">{overview.total_schools || 0}</p>
              <p className="data-card-meta">Белсенді: {overview.active_schools || 0}</p>
            </div>
            <div className="data-card">
              <h3>Барлық пайдаланушылар</h3>
              <p className="data-card-number">{overview.total_users || 0}</p>
              <p className="data-card-meta">30 күн: {overview.active_users_last_30_days || 0}</p>
            </div>
            <div className="data-card">
              <h3>Жаңа тіркелулер</h3>
              <p className="data-card-number">{overview.recent_signups_last_30_days || 0}</p>
              <p className="data-card-meta">Соңғы 30 күн</p>
            </div>
            <div className="data-card">
              <h3>Аудит түрлері</h3>
              <p className="data-card-number">{overview.activity_counts?.length || 0}</p>
              <p className="data-card-meta">Бақыланатын түрлер</p>
            </div>
          </div>

          <div className="data-card" style={{ marginTop: 24 }}>
            <h3>Қызмет көрсеткіштері</h3>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Көрсеткіш</th>
                    <th>Мән</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Белсенді мектептер</td>
                    <td>{overview.active_schools || 0}</td>
                  </tr>
                  <tr>
                    <td>Пайдаланушылар</td>
                    <td>{overview.total_users || 0}</td>
                  </tr>
                  <tr>
                    <td>30 күндегі тіркелулер</td>
                    <td>{overview.recent_signups_last_30_days || 0}</td>
                  </tr>
                  <tr>
                    <td>Админдер</td>
                    <td>{overview.admin_users || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {overview.activity_counts?.length > 0 && (
            <div className="data-card" style={{ marginTop: 24 }}>
              <h3>Соңғы аудит әрекеттері</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Әрекет</th>
                      <th>Саны</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.activity_counts.map((item) => (
                      <tr key={item.action}>
                        <td>{item.action}</td>
                        <td>{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </SuperAdminShell>
  );
}
