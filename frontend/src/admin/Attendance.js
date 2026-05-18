import React, { useState, useEffect, useCallback } from 'react';
import api, { confirmDelete, showToast } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function reasonLabel(row) {
  if (row.note && String(row.note).trim()) return row.note;
  if (row.status === 'absent') return 'Келмеді';
  if (row.status === 'late') return 'Кешігіп келді';
  return row.status || '—';
}

function formatLessonContext(lc) {
  if (!lc || typeof lc !== 'object') return null;
  const parts = [];
  if (lc.subject) parts.push(lc.subject);
  if (lc.class_name) parts.push(`${lc.class_name} сынып`);
  if (lc.teacher) parts.push(`мұғалім: ${lc.teacher}`);
  if (lc.room) parts.push(`кабинет: ${lc.room}`);
  if (lc.weekday) parts.push(lc.weekday);
  if (lc.time_start && lc.time_end) parts.push(`уақыт: ${lc.time_start}-${lc.time_end}`);
  if (lc.period) parts.push(`(${lc.period} период)`);
  return parts.length ? parts.join(', ') : null;
}

export default function Attendance() {
  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);

  const [classId, setClassId] = useState('');
  const [q, setQ] = useState('');
  const [noteQ, setNoteQ] = useState('');
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
      limit: '50',
      page: '1',
    });
    if (classId) params.set('class_id', classId);
    if (q.trim()) params.set('q', q.trim());
    if (noteQ.trim()) params.set('note_q', noteQ.trim());
    const res = await api.attendance.list(params.toString());
    if (res.success) {
      setRows(res.data || []);
      setPagination(res.pagination || { total: 0, page: 1, pages: 1 });
    } else showToast(res.message || 'Қате', 'error');
    setLoading(false);
  }, [classId, q, noteQ, dateFrom, dateTo]);

  useEffect(() => {
    (async () => {
      const c = await api.students.classes();
      if (c.success) setClasses(c.data || []);
    })();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id) => {
    setDetailLoading(true);
    setDetail(null);
    const res = await api.attendance.get(id);
    if (res.success) {
      let d = res.data;
      if (d.lesson_context && typeof d.lesson_context === 'string') {
        try {
          d = { ...d, lesson_context: JSON.parse(d.lesson_context) };
        } catch (_) {
          /* ignore */
        }
      }
      setDetail(d);
    }
    else showToast(res.message || 'Қате', 'error');
    setDetailLoading(false);
  };

  const removeRow = async (id) => {
    if (!(await confirmDelete('Бұл жазбаны жоясыз ба?'))) return;
    const res = await api.attendance.delete(id);
    if (res.success) {
      showToast('Жойылды', 'success');
      load();
      if (detail && detail.id === id) setDetail(null);
    } else showToast(res.message || 'Қате', 'error');
  };

  const exportWord = () => {
    const esc = (s) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    let html = `<html><head><meta charset="utf-8"><title>Кешіккендер</title></head><body>`;
    html += `<h2>Кешіккендер/келмегендер тізімі</h2>`;
    html += `<p>${dateFrom} — ${dateTo}</p><table border="1" cellpadding="6" cellspacing="0"><tr>`;
    ['ID', 'Оқушы', 'Сынып', 'Күні', 'Себеп'].forEach((h) => {
      html += `<th>${esc(h)}</th>`;
    });
    html += `</tr>`;
    rows.forEach((r) => {
      html += `<tr><td>${esc(r.id)}</td><td>${esc(r.student_name)}</td><td>${esc(r.class_name)}</td>`;
      html += `<td>${esc(r.date)}</td><td>${esc(reasonLabel(r))}</td></tr>`;
    });
    html += `</table></body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `keshipkender-${dateFrom}.doc`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const clearFilters = () => {
    setClassId('');
    setQ('');
    setNoteQ('');
    const t = todayISO();
    setDateFrom(t);
    setDateTo(t);
  };

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '1200px', margin: '20px auto', padding: '30px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px' }}>Кешіккендер/келмегендер тізімі</h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Кешігіп қалған немесе келмеген оқушылар</p>
          </div>
          <button type="button" className="ap-btn" style={{ backgroundColor: '#10b981', color: '#fff' }} onClick={exportWord}>
            <i className="fas fa-file-word" style={{ marginRight: '8px' }}></i> Word-қа экспорттау
          </button>
        </div>

        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--ap-border)', borderRadius: '12px', padding: '20px', marginBottom: '30px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#f8fafc', margin: '0 0 15px' }}>Сүзгілер</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) minmax(200px, 1.5fr) minmax(130px, 1fr) minmax(130px, 1fr) minmax(200px, 1.5fr)', gap: '15px', alignItems: 'end' }}>
            <div>
              <label className="ap-form-label">Сынып</label>
              <select className="ap-input" value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Барлық сыныптар</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ap-form-label">Оқушы аты</label>
              <input
                className="ap-input"
                placeholder="Аты-жөнін іздеу..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div>
              <label className="ap-form-label">Басталған күні</label>
              <input type="date" className="ap-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="ap-form-label">Аяқталған күні</label>
              <input type="date" className="ap-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="ap-form-label">Себеп</label>
              <input
                className="ap-input"
                placeholder="Себебін іздеу..."
                value={noteQ}
                onChange={(e) => setNoteQ(e.target.value)}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <button type="button" className="ap-btn ap-btn-primary" onClick={() => load()}>
              Сүзгіні қолдану
            </button>
            <button type="button" className="ap-btn" style={{ backgroundColor: '#e2e8f0', color: '#94a3b8', border: 'none' }} onClick={clearFilters}>
              Тазалау
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Жүктелуде…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--ap-border)' }}>
            <i className="fas fa-user-clock" style={{ fontSize: '32px', marginBottom: '16px', color: '#cbd5e1' }}></i>
            <p>Жазбалар жоқ</p>
          </div>
        ) : (
          <div className="ap-table-responsive">
            <table className="ap-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Оқушы</th>
                  <th>Сынып</th>
                  <th style={{ textAlign: 'center' }}>Күні</th>
                  <th>Себеп</th>
                  <th style={{ textAlign: 'center', width: '120px' }}>Әрекет</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ color: '#64748b' }}>{r.id}</td>
                    <td style={{ fontWeight: '600', color: '#f1f5f9' }}>{r.student_name}</td>
                    <td style={{ color: '#64748b' }}>{r.class_name || '—'}</td>
                    <td style={{ textAlign: 'center', color: '#64748b' }}>
                      <i className="far fa-calendar-alt" style={{ marginRight: '6px' }}></i>{r.date}
                    </td>
                    <td>
                      <span style={{ color: r.status === 'absent' ? '#ef4444' : r.status === 'late' ? '#eab308' : '#64748b', fontWeight: '500' }}>
                        {reasonLabel(r)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => openDetail(r.id)} style={{ color: '#3b82f6', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', marginRight: '5px' }}>
                        <i className="far fa-eye"></i>
                      </button>
                      <button onClick={() => removeRow(r.id)} style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '5px' }}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {pagination.total > 0 && (
          <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b', textAlign: 'right' }}>
            Барлығы: {pagination.total}
          </div>
        )}

      </div>

      {(detail || detailLoading) && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal" style={{ maxWidth: 640, borderRadius: 15, boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ padding: 30 }}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', color: '#64748b' }}>Жүктелуде…</div>
              ) : detail ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <i className="fas fa-bell" style={{ fontSize: '1.5rem', color: '#3b82f6' }}></i>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#f8fafc' }}>Кешіккен туралы ақпарат</h2>
                  </div>
                  <div style={{ display: 'grid', gap: '15px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Оқушы</div>
                      <div style={{ fontWeight: '600', color: '#f1f5f9', fontSize: '16px' }}>{detail.student_name}</div>
                    </div>
                    {formatLessonContext(detail.lesson_context) && (
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Сабақ</div>
                        <div style={{ color: '#94a3b8' }}>{formatLessonContext(detail.lesson_context)}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Себебі</div>
                      <div style={{ color: detail.status === 'absent' ? '#ef4444' : detail.status === 'late' ? '#eab308' : '#334155', fontWeight: '500' }}>{reasonLabel(detail)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Күні</div>
                      <div style={{ color: '#94a3b8' }}>{detail.date}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button type="button" className="ap-btn" style={{ backgroundColor: '#e2e8f0', color: '#94a3b8', border: 'none' }} onClick={() => setDetail(null)}>
                      Артқа
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
