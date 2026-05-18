import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { showToast } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

function weekBounds() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(now);
  mon.setDate(diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const iso = (d) => d.toISOString().split('T')[0];
  return { from: iso(mon), to: iso(sun) };
}

function statusText(row) {
  if (row.has_gifted && row.has_under) return 'Есеп тапсырған';
  if (row.has_gifted || row.has_under) return 'Жартылай тапсырған';
  if (row.report_count > 0) return 'Жартылай тапсырған';
  return 'Есеп тапсырмаған';
}

function statusColor(row) {
  if (row.has_gifted && row.has_under) return '#22c55e';
  if (row.has_gifted || row.has_under || row.report_count > 0) return '#eab308';
  return '#ef4444';
}

function statusBadge(row) {
  const t = statusText(row);
  const c = statusColor(row);
  const bg = c === '#22c55e' ? '#dcfce7' : c === '#eab308' ? '#fef08a' : '#fee2e2';
  return (
    <span style={{ color: c, backgroundColor: bg, padding: '4px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: '600' }}>
      {t}
    </span>
  );
}

export default function ReportTeacherStatus() {
  const w = weekBounds();
  const [from, setFrom] = useState(w.from);
  const [to, setTo] = useState(w.to);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.studentReports.teacherStatus(from, to);
    if (res.success) setRows(res.data || []);
    else showToast(res.message || 'Қате', 'error');
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const full = rows.filter((r) => r.has_gifted && r.has_under).length;
  const partial = rows.filter((r) => (r.has_gifted || r.has_under) && !(r.has_gifted && r.has_under)).length;
  const none = rows.filter((r) => !r.has_gifted && !r.has_under).length;

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '1200px', margin: '20px auto', padding: '30px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <Link to="/admin/reports" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
              <i className="fas fa-arrow-left"></i> Есептерге қайту
            </Link>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0 0' }}>Мұғалімдердің есеп статусы</h1>
            <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Апталық кезең: {from} — {to}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button type="button" className="ap-btn" style={{ backgroundColor: '#f97316', color: '#fff', border: 'none' }} onClick={() => showToast('Ескерту жіберу әзірге қосылмаған', 'info')}>
              <i className="fas fa-bell"></i> Ескерту жіберу
            </button>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc' }}>{rows.length}</div>
              <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Мұғалім</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
          <div style={{ flex: 1 }}>
            <label className="ap-form-label">Басталуы</label>
            <input type="date" className="ap-input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="ap-form-label">Аяғы</label>
            <input type="date" className="ap-input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--ap-border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <i className="fas fa-check-circle" style={{ color: '#22c55e', fontSize: '24px', marginBottom: '8px' }}></i>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f8fafc' }}>{full}</div>
            <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase' }}>Толық есеп</div>
          </div>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--ap-border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <i className="fas fa-clock" style={{ color: '#eab308', fontSize: '24px', marginBottom: '8px' }}></i>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f8fafc' }}>{partial}</div>
            <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase' }}>Жартылай есеп</div>
          </div>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--ap-border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <i className="fas fa-exclamation-circle" style={{ color: '#ef4444', fontSize: '24px', marginBottom: '8px' }}></i>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f8fafc' }}>{none}</div>
            <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase' }}>Есеп жоқ</div>
          </div>
        </div>

        <div className="ap-table-responsive">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Мұғалім аты-жөні</th>
                <th style={{ textAlign: 'center' }}>Дарынды есеп</th>
                <th style={{ textAlign: 'center' }}>Үлгерімі төмен есеп</th>
                <th style={{ textAlign: 'center' }}>Жазбалар</th>
                <th style={{ textAlign: 'center' }}>Статус</th>
                <th style={{ textAlign: 'center', width: '150px' }}>Әрекет</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Жүктелуде…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Мәлімет жоқ</td></tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: '600', color: '#f1f5f9' }}>{t.full_name}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {t.has_gifted ? <span style={{ color: '#22c55e' }}><i className="fas fa-check"></i></span> : <span style={{ color: '#ef4444' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {t.has_under ? <span style={{ color: '#22c55e' }}><i className="fas fa-check"></i></span> : <span style={{ color: '#ef4444' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: '500' }}>{t.report_count}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {statusBadge(t)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => window.location.href = `/admin/reports?teacher_id=${t.id}`} className="ap-btn" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                        <i className="fas fa-eye" style={{ marginRight: '6px' }}></i> Көру
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
