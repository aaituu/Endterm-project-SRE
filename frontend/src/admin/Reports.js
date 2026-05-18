import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { formatDate, showToast } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

const RT_LABEL = { gifted: 'Дарынды', underperforming: 'Үлгерімі төмен' };

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [reportType, setReportType] = useState('all');
  const [teacherId, setTeacherId] = useState(() => searchParams.get('teacher_id') || '');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState('10');

  useEffect(() => {
    const tid = searchParams.get('teacher_id');
    if (tid) setTeacherId(tid);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: '1', limit });
    if (reportType !== 'all') p.set('report_type', reportType);
    if (teacherId) p.set('teacher_id', teacherId);
    if (q.trim()) p.set('q', q.trim());
    const res = await api.studentReports.list(p.toString());
    if (res.success) {
      setRows(res.data || []);
      setPagination(res.pagination || { total: 0, page: 1, pages: 1 });
    } else showToast(res.message || 'Қате', 'error');
    setLoading(false);
  }, [reportType, teacherId, q, limit]);

  useEffect(() => {
    (async () => {
      const t = await api.teachers.list('limit=500');
      if (t.success) setTeachers(t.data || []);
    })();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '1200px', margin: '20px auto', padding: '30px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px' }}>Үлгерімі төмен және дарынды оқушылар есептері</h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Мұғалімдер жіберген есептерді қарау және талдау</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to="/admin/reports/status" className="ap-btn" style={{ backgroundColor: '#2563eb', color: '#fff' }}>
              <i className="fas fa-users" style={{ marginRight: '8px' }}></i> Мұғалімдер статусы
            </Link>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc' }}>{pagination.total}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Барлық есеп</div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--ap-card)', border: '1px solid var(--ap-border)', borderRadius: '12px', padding: '20px', marginBottom: '30px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) minmax(200px, 1.5fr) minmax(200px, 2fr) 100px', gap: '15px', alignItems: 'end' }}>
            <div>
              <label className="ap-form-label">Есеп түрі</label>
              <select className="ap-input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="all">Барлығы</option>
                <option value="gifted">Дарынды</option>
                <option value="underperforming">Үлгерімі төмен</option>
              </select>
            </div>
            <div>
              <label className="ap-form-label">Мұғалім</label>
              <select className="ap-input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                <option value="">Барлығы</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="ap-form-label">Іздеу</label>
              <input
                className="ap-input"
                placeholder="Есеп мәтінінен іздеу..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div>
              <label className="ap-form-label">Көресету</label>
              <select className="ap-input" value={limit} onChange={(e) => setLimit(e.target.value)}>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: '15px' }}>
            <button
              onClick={() => { setReportType('all'); setTeacherId(''); setQ(''); setSearchParams({}); }}
              className="ap-btn" style={{ padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>
              Тазалау
            </button>
          </div>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#f8fafc' }}>Есептер тізімі</h2>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Жүктелуде…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--ap-border)' }}>
            <i className="fas fa-file-alt" style={{ fontSize: '32px', marginBottom: '16px', color: 'var(--ap-sidebar-text)' }}></i>
            <p>Теңшеулерге сәйкес есептер табылған жоқ.</p>
          </div>
        ) : (
          <div className="ap-table-responsive" style={{ backgroundColor: 'var(--ap-card)', border: '1px solid var(--ap-border)', borderRadius: '12px' }}>
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Мұғалім</th>
                  <th>Оқушылар / Пән</th>
                  <th>Есеп түрі</th>
                  <th>Тақырып</th>
                  <th>Күні</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>Әрекет</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: '600', color: '#f1f5f9' }}>{r.teacher_name}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{r.created_at ? formatDate(r.created_at) : ''}</div>
                    </td>
                    <td>
                      <div style={{ color: '#60a5fa', fontWeight: '500' }}>{r.subject_name || 'Пәнсіз'}</div>
                    </td>
                    <td>
                      <span style={{ 
                        color: r.report_type === 'gifted' ? '#fcd34d' : '#fca5a5', 
                        backgroundColor: r.report_type === 'gifted' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(220, 38, 38, 0.2)', 
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' 
                      }}>
                        <i className={`fas ${r.report_type === 'gifted' ? 'fa-star' : 'fa-user'}`} style={{ marginRight: '6px' }}></i>
                        {RT_LABEL[r.report_type] || r.report_type}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '14px', color: '#cbd5e1', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.topic || '—'}
                      </div>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '13px' }}>
                      <i className="far fa-calendar-alt" style={{ marginRight: '6px' }}></i>
                      {r.report_date ? formatDate(r.report_date) : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Link to={`/admin/reports/${r.id}`} className="ap-btn" style={{ padding: '6px 14px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#f1f5f9', textDecoration: 'none' }}>
                        <i className="far fa-eye" style={{ marginRight: '6px' }}></i> Қарау
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
