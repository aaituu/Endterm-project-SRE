import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api from '../utils/api.js';

export default function CompetitionApplications() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/olympiads/admin-applications');
      if (res.success) {
        setData(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Өшіруді растайсыз ба?')) return;
    try {
      const res = await api.delete(`/olympiads/admin-applications/${id}`);
      if (res.success) {
        fetchApplications();
      } else {
        alert(res.message || 'Қате');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminShell>
      <div className="ap-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Жарысқа қатысу өтінімдері</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="ap-btn" style={{ backgroundColor: '#10b981', color: 'white', border: 'none' }}>
            <i className="fas fa-file-excel"></i> Excel экспорт ({data.length})
          </button>
          <Link to="/admin/olympiads/applications/new" className="ap-btn ap-btn-primary">
            <i className="fas fa-plus"></i> Қосу
          </Link>
        </div>
      </div>

      <div className="ap-card">
        <div className="ap-table-responsive">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Мұғалім</th>
                <th>Лауазымы</th>
                <th>Оқушы</th>
                <th>Жарыс түрі</th>
                <th>Пән</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Әрекет</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Жүктелуде...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Өтінімдер табылмады</td></tr>
              ) : (
                data.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '500' }}>{item.teacher_name}</td>
                    <td style={{ fontSize: '0.9rem', color: '#4b5563' }}>{item.teacher_category || item.teacher_subject}</td>
                    <td style={{ fontWeight: '500' }}>{item.student_name}</td>
                    <td style={{ color: '#4b5563' }}>{item.competition_type}</td>
                    <td style={{ color: '#4b5563', fontSize: '0.9rem' }}>{item.competition_subtype}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '5px' }}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
