import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

function fileBase() {
  return window.location.port === '5500' || window.location.port === '5173' || window.location.port === '5010'
    ? `http://${window.location.hostname}:3001`
    : '';
}

const Attestations = () => {
  const [rows, setRows] = useState([]);
  const [types, setTypes] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ teacher_id: '', type_id: '', issued_at: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [aRes, tRes, teRes] = await Promise.all([
      api.attestations.list(),
      api.attestations.typesList(),
      api.teachers.list('limit=500')
    ]);
    if (aRes.success) setRows(aRes.data || []);
    if (tRes.success) setTypes(tRes.data || []);
    if (teRes.success) setTeachers(teRes.data || []);
    setLoading(false);
  };

  const exportExcel = () => {
    const header = ['id', 'teacher', 'type', 'issued_at', 'expires_at'];
    const lines = [header.join(';'), ...rows.map((r) => [r.id, `"${(r.teacher_name || '').replace(/"/g, '""')}"`, `"${(r.type_name || r.category || '').replace(/"/g, '""')}"`, r.issued_at || '', r.expires_at || ''].join(';'))];
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attestations_${Date.now()}.csv`;
    a.click();
  };

  const save = async () => {
    if (!form.teacher_id || !form.type_id || !form.issued_at) {
      alert('Барлық өрістерді толтырыңыз');
      return;
    }
    const res = await api.attestations.create({
      teacher_id: Number(form.teacher_id),
      type_id: Number(form.type_id),
      issued_at: form.issued_at
    });
    if (res.success) {
      setModal(false);
      setForm({ teacher_id: '', type_id: '', issued_at: new Date().toISOString().slice(0, 10) });
      load();
    } else alert(res.message || 'Қате');
  };

  const remove = async (id) => {
    if (!window.confirm('Жою?')) return;
    const res = await api.attestations.delete(id);
    if (res.success) load();
  };

  const docUrl = (r) => {
    const u = r.document_url || r.certificate_url;
    if (!u) return null;
    if (u.startsWith('http')) return u;
    return `${fileBase()}/${u.replace(/^\//, '')}`;
  };

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Аттестациялар</h1>
          <p className="ap-page-sub">Мұғалімдердің аттестациялары</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={() => setModal(true)}>+ Қосу</button>
          <button type="button" className="btn btn-success" onClick={exportExcel}><i className="fas fa-file-excel"></i> Excel экспорты</button>
          <Link to="/admin/attestations/types" className="btn btn-secondary">Түрлері</Link>
        </div>
      </div>

      <div className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Пайдаланушы</th>
                <th>Аттестация түрі</th>
                <th>Күні</th>
                <th>Келесі аттестация</th>
                <th>Әрекет</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6"><i className="fas fa-spinner fa-spin"></i></td></tr>
              ) : rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td><strong>{r.teacher_name || '—'}</strong></td>
                  <td>{r.type_name || r.category || '—'}</td>
                  <td>{r.issued_at ? new Date(r.issued_at).toLocaleDateString('kk-KZ') : '—'}</td>
                  <td>{r.expires_at ? new Date(r.expires_at).toLocaleDateString('kk-KZ') : '—'}</td>
                  <td>
                    {docUrl(r) ? (
                      <a href={docUrl(r)} target="_blank" rel="noreferrer" style={{ color: '#16a34a', marginRight: 12 }} title="Жүктеу"><i className="fas fa-download"></i></a>
                    ) : (
                      <span style={{ color: '#cbd5e1', marginRight: 12 }}><i className="fas fa-download"></i></span>
                    )}
                    <button type="button" style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => remove(r.id)}><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ padding: 24 }}>
              <h3 style={{ marginTop: 0 }}>Жаңа аттестация қосу</h3>
              <div className="form-group">
                <label className="ap-form-label">Мұғалім *</label>
                <select className="ap-input" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}>
                  <option value="">Таңдаңыз</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Аттестация түрі *</label>
                <select className="ap-input" value={form.type_id} onChange={(e) => setForm({ ...form, type_id: e.target.value })}>
                  <option value="">Таңдаңыз</option>
                  {types.map((t) => <option key={t.id} value={t.id}>{t.name_kz}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Күні *</label>
                <input className="ap-input" type="date" value={form.issued_at} onChange={(e) => setForm({ ...form, issued_at: e.target.value })} />
              </div>
              <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={save}>Сақтау</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

export default Attestations;
