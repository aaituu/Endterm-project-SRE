import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { formatDate, formatDateTime, getImageUrl, showToast } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

const RT_LABEL = { gifted: 'Дарынды', underperforming: 'Үлгерімі төмен' };
const SCORE = {
  2: '2',
  3: '3 — Қанағаттанарлық',
  4: '4 — Жақсы',
  5: '5 — Өте жақсы',
};

export default function ReportDetail() {
  const { id } = useParams();
  const [r, setR] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await api.studentReports.get(id);
      if (res.success) setR(res.data);
      else showToast(res.message || 'Қате', 'error');
      setLoading(false);
    })();
  }, [id]);

  const printPage = () => window.print();

  if (loading || !r) {
    return (
      <AdminShell>
        <p>{loading ? 'Жүктелуде…' : 'Табылмады'}</p>
        <Link to="/admin/reports">← Есептер тізіміне қайту</Link>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div
        className="ap-card no-print"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #4338ca 100%)',
          color: '#fff',
          marginBottom: 20,
        }}
      >
        <Link to="/admin/reports" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', display: 'inline-block', marginBottom: 12 }}>
          ← Есептер тізіміне қайту
        </Link>
        <h1 style={{ margin: '0 0 8px', fontSize: '1.35rem' }}>Үлгерімі төмен және дарынды оқушылар туралы есеп</h1>
        <p style={{ margin: 0, opacity: 0.9 }}>{r.teacher_name}</p>
        <span className="ap-badge" style={{ marginTop: 12, background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
          {r.report_type === 'underperforming' ? 'Үлгерімі төмен оқушылар' : RT_LABEL[r.report_type]}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }} className="report-detail-grid">
        <div className="ap-card">
          <h3 style={{ color: '#2563eb', marginTop: 0 }}>Есеп мәтіні</h3>
          <h4 style={{ margin: '0 0 16px' }}>
            {r.report_type === 'underperforming' ? 'Үлгерімі төмен оқушылар есебі' : 'Дарынды оқушылар есебі'}
          </h4>
          <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
            <div>
              <strong>Күні:</strong> {r.report_date || '—'}
            </div>
            <div>
              <strong>Пән:</strong> {r.subject_name || '—'}
            </div>
            <div>
              <strong>Тақырып:</strong> {r.topic || '—'}
            </div>
            <div>
              <strong>Тапсырма түрі:</strong> {r.task_type || '—'}
            </div>
            <div>
              <strong>Оқушы:</strong> {r.student_name} — {r.score != null ? SCORE[r.score] || r.score : '—'}
            </div>
            {r.feedback && (
              <div>
                <strong>Пікір:</strong>
                <p style={{ whiteSpace: 'pre-wrap' }}>{r.feedback}</p>
              </div>
            )}
          </div>
          {r.photo_url && (
            <img src={getImageUrl(r.photo_url)} alt="" style={{ maxWidth: '100%', borderRadius: 8 }} />
          )}
        </div>

        <div>
          <div className="ap-card" style={{ marginBottom: 16 }}>
            <h4 style={{ marginTop: 0 }}>Есеп туралы мәліметтер</h4>
            <div style={{ fontSize: '0.95rem', color: '#94a3b8', display: 'grid', gap: 8 }}>
              <div>
                <strong>Мұғалім:</strong> {r.teacher_name}
              </div>
              <div>
                <strong>Түрі:</strong> {RT_LABEL[r.report_type] || r.report_type}
              </div>
              <div>
                <strong>Күні:</strong> {r.report_date || '—'}
              </div>
              <div>
                <strong>Жіберілді:</strong> {r.created_at ? formatDateTime(r.created_at) : '—'}
              </div>
              <div>
                <strong>Пән / тақырып:</strong> {r.subject_name || '—'} / {r.topic || '—'}
              </div>
            </div>
          </div>

          <div className="ap-card no-print">
            <h4 style={{ marginTop: 0 }}>Әрекеттер</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={printPage}>
                <i className="fas fa-print" style={{ marginRight: 8 }}></i>
                Есепті басып шығару
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => window.alert('PDF экспорт кейін қосылады')}>
                <i className="fas fa-download" style={{ marginRight: 8 }}></i>
                PDF-ке экспорттау
              </button>
              <Link to="/admin/reports" className="btn btn-primary">
                <i className="fas fa-list" style={{ marginRight: 8 }}></i>
                Барлық есептерге қайту
              </Link>
            </div>
          </div>

          <div className="ap-card">
            <h4 style={{ marginTop: 0 }}>Оқушылар статистикасы</h4>
            <p style={{ margin: 0, color: '#64748b' }}>
              Барлық оқушылар: 1. Бағалау: {r.score != null ? `${r.score} балл` : '—'}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .sidebar, .admin-topbar { display: none !important; }
          .report-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AdminShell>
  );
}
