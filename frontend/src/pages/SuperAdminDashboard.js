import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminShell from '../components/SuperAdminShell.js';
import api, { showToast } from '../utils/api.js';

export default function SuperAdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [analyticsRes, schoolsRes] = await Promise.all([api.superAdmin.analytics(), api.schools.list('limit=8')]);
      if (analyticsRes.success) {
        setOverview(analyticsRes.data);
      } else {
        showToast(analyticsRes.message || 'Аналитика жүктелмеді', 'error');
      }
      if (schoolsRes.success) {
        setSchools(schoolsRes.data || []);
      } else {
        showToast(schoolsRes.message || 'Мектептер жүктелмеді', 'error');
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <SuperAdminShell>
      <div className="ap-page-head" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="ap-page-title">Global Super Admin</h1>
          <p className="ap-page-sub">Барлық мектептер, пайдаланушылар және SaaS деректерін бір жерден бақылау</p>
        </div>
      </div>

      {loading ? (
        <p>Жүктелуде...</p>
      ) : (
        <>
          {overview && (
            <div className="ap-grid-4" style={{ gap: 18 }}>
              <div className="data-card">
                <h3>Мектептер</h3>
                <p className="data-card-number">{overview.total_schools}</p>
                <p className="data-card-meta">Белсенді: {overview.active_schools}</p>
              </div>
              <div className="data-card">
                <h3>Пайдаланушылар</h3>
                <p className="data-card-number">{overview.total_users}</p>
                <p className="data-card-meta">30 күн: {overview.active_users_last_30_days}</p>
              </div>
              <div className="data-card">
                <h3>Тіркелгендер</h3>
                <p className="data-card-number">{overview.recent_signups_last_30_days}</p>
                <p className="data-card-meta">Админдер: {overview.admin_users}</p>
              </div>
              <div className="data-card">
                <h3>Аудит түрлері</h3>
                <p className="data-card-number">{overview.activity_counts.length}</p>
                <p className="data-card-meta">Соңғы 30 күндегі әрекеттер</p>
              </div>
            </div>
          )}

          <div className="data-card" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Жақында қосылған мектептер</h3>
                <p className="ap-page-sub">Тез өту және мектеп панелін басқару</p>
              </div>
              <button className="btn btn-outline" onClick={() => navigate('/super-admin/schools')}>Барлық мектептер</button>
            </div>
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Аты</th>
                    <th>Slug</th>
                    <th>Код</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school) => (
                    <tr key={school.id} onClick={() => navigate(`/super-admin/schools/${school.id}`)} style={{ cursor: 'pointer' }}>
                      <td>{school.name}</td>
                      <td>{school.slug}</td>
                      <td>{school.code}</td>
                      <td>{school.is_active ? 'Белсенді' : 'Бұғатталған'}</td>
                    </tr>
                  ))}
                  {schools.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center' }}>Мектептер табылмады</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </SuperAdminShell>
  );
}
