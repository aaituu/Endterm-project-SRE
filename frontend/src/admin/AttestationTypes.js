import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

const AttestationTypes = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await api.attestations.typesList();
    if (res.success) setRows(res.data || []);
    setLoading(false);
  };

  const save = async () => {
    if (!name.trim()) return;
    if (modal?.mode === 'edit') {
      const res = await api.attestations.typeUpdate(modal.id, { name_kz: name.trim() });
      if (res.success) { setModal(null); setName(''); load(); }
      else alert(res.message || 'Қате');
    } else {
      const res = await api.attestations.typeCreate({ name_kz: name.trim() });
      if (res.success) { setModal(null); setName(''); load(); }
      else alert(res.message || 'Қате');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Жою?')) return;
    const res = await api.attestations.typeDelete(id);
    if (res.success) load();
    else alert(res.message || 'Қате');
  };

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Аттестация түрлері</h1>
          <p className="ap-page-sub">Санаттар тізімі</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/admin/attestations" className="btn btn-secondary">Артқа</Link>
          <button type="button" className="btn btn-primary" onClick={() => { setName(''); setModal({ mode: 'add' }); }}>+ Қосу</button>
        </div>
      </div>

      <div className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr style={{ background: '#e0f2fe' }}><th>ID</th><th>Атауы</th><th>Әрекет</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3"><i className="fas fa-spinner fa-spin"></i></td></tr>
              ) : rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td><strong>{r.name_kz}</strong></td>
                  <td>
                    <button type="button" style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', marginRight: 12 }} onClick={() => { setName(r.name_kz); setModal({ mode: 'edit', id: r.id }); }}><i className="fas fa-edit"></i></button>
                    <button type="button" style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => remove(r.id)}><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ padding: 24 }}>
              <h3 style={{ marginTop: 0 }}>{modal.mode === 'edit' ? 'Өңдеу' : 'Жаңа түр'}</h3>
              <div className="form-group">
                <label className="ap-form-label">Атауы *</label>
                <input className="ap-input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Болдырмау</button>
                <button type="button" className="btn btn-primary" onClick={save}>Сақтау</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

export default AttestationTypes;
