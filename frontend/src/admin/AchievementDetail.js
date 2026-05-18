import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminShell from '../components/AdminShell.js';
import api from '../utils/api.js';

export default function AchievementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/student-achievements/${id}`);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (verified) => {
    try {
      const res = await api.put(`/student-achievements/${id}`, {
        verified
      });
      if (res.success) {
        setData(res.data);
      }
    } catch (e) {
      console.error(e);
      alert('Error updating status');
    }
  };

  const publishToNews = async () => {
    try {
      const res = await api.put(`/student-achievements/${id}`, {
        publish_to_news: 'pending'
      });
      if (res.success) {
        setData(res.data);
      }
    } catch (e) {
      console.error(e);
      alert('Error publishing to news');
    }
  };

  if (loading) {
    return <AdminShell><div style={{ padding: 20 }}>Жүктелуде...</div></AdminShell>;
  }

  if (!data) {
    return <AdminShell><div style={{ padding: 20 }}>Табылмады</div></AdminShell>;
  }

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '800px', margin: '20px auto', padding: '30px' }}>

        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '10px' }}>
            Жетістік #{data.id}
          </h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            {!data.verified && (
              <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '16px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <i className="far fa-clock"></i> Тексеру күтілуде
              </span>
            )}
            {data.verified && (
              <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '16px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <i className="far fa-eye"></i> Қаралған
              </span>
            )}
          </div>
        </div>

        <hr style={{ borderTop: '1px solid #e5e7eb', marginBottom: '20px' }} />

        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Байқау туралы ақпарат</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
          <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '5px' }}>Байқау атауы</div>
            <div style={{ fontWeight: '600' }}>{data.competition_name}</div>
          </div>
          <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '5px' }}>Түрі</div>
            <div style={{ fontWeight: '600' }}>{data.achievement_type || '—'}</div>
          </div>
          <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '5px' }}>Деңгейі</div>
            <div style={{ fontWeight: '600' }}>{data.level || '—'}</div>
          </div>
          <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '5px' }}>Күні</div>
            <div style={{ fontWeight: '600' }}>{data.achievement_date ? new Date(data.achievement_date).toISOString().split('T')[0] : '—'}</div>
          </div>
          <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '5px' }}>Орын</div>
            <div style={{ fontWeight: '600' }}>{data.place_rank || '—'}</div>
          </div>
          <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '5px' }}>Статус</div>
            <div style={{ fontWeight: '600' }}>{data.status === 'pending' ? 'Әрекет керек емес' : (data.status === 'reviewed' ? 'Қаралған' : data.status)}</div>
          </div>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Қатысушы</h3>
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#eff6ff', padding: '15px', borderRadius: '8px', marginBottom: '30px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginRight: '15px' }}>
            <i className="fas fa-user"></i>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{data.student_name}</div>
            <div style={{ fontSize: '13px', color: '#3b82f6' }}>Қатысушы</div>
          </div>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Куратор</h3>
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '8px', marginBottom: '30px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', marginRight: '15px' }}>
            <i className="fas fa-user-tie"></i>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', color: '#14532d' }}>{data.teacher_name || 'Көрсетілмеген'}</div>
            <div style={{ fontSize: '13px', color: '#22c55e' }}>{data.teacher_role || 'Мұғалім'}</div>
          </div>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Сертификат</h3>
        <div style={{ marginBottom: '40px' }}>
          {data.certificate_url ? (
            <a href={`/${data.certificate_url}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '8px 16px', borderRadius: '6px', textDecoration: 'none', fontWeight: '500' }}>
              <i className="fas fa-file-alt"></i> Сертификатты көру
            </a>
          ) : (
            <div style={{ color: '#6b7280', fontStyle: 'italic' }}>Жүктелген жоқ</div>
          )}
        </div>

        <hr style={{ borderTop: '1px solid #e5e7eb', marginBottom: '20px' }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
          {!data.verified && (
            <button onClick={() => updateStatus(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: '500', cursor: 'pointer', flex: 1, justifyContent: 'center' }}>
              <i className="fas fa-check"></i> Тексерілді деп белгілеу
            </button>
          )}

          <button onClick={publishToNews} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#8b5cf6', color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: '500', cursor: 'pointer', flex: 1, justifyContent: 'center' }}>
            <i className="far fa-newspaper"></i> Жаңалыққа шығару
          </button>

          <Link to={`/admin/olympiads/achievements/${data.id}/edit`} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: '500', flex: 1, justifyContent: 'center' }}>
            <i className="far fa-edit"></i> Өңдеу
          </Link>

          <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f3f4f6', color: '#4b5563', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: '500', cursor: 'pointer', flex: 1, justifyContent: 'center' }}>
            <i className="fas fa-arrow-left"></i> Артқа
          </button>
        </div>

      </div>
    </AdminShell>
  );
}
