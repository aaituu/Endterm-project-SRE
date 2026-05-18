import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

const Roles = () => {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ label_kz: '', name: '' });

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    setUser(api.getUser());
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await api.roles.list();
    if (res.success) setRoles(res.data || []);
    setLoading(false);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({ label_kz: r.label_kz || r.display_name || '', name: r.name });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const res = await api.roles.update(editing.id, { label_kz: form.label_kz, name: form.name });
    if (res.success) {
      setEditOpen(false);
      load();
    } else alert(res.message || 'Қате');
  };

  const remove = async (r) => {
    if (!window.confirm(`"${r.display_name || r.name}" рөлін жою?`)) return;
    const res = await api.roles.delete(r.id);
    if (res.success) load();
    else alert(res.message || 'Қате');
  };

  if (!user) return null;

  return (
    <AdminShell>
      <h1 className="ap-page-title">Рөлдер</h1>
      <p className="ap-page-sub">Жүйе рөлдері мен пайдаланушылар саны</p>

      <div className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Рөл атауы</th>
                <th>Пайдаланушылар</th>
                <th>Әрекеттер</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="loading-spinner"><i className="fas fa-spinner fa-spin"></i></td></tr>
              ) : roles.map((r) => (
                <tr key={r.id}>
                  <td className="td-id">{r.id}</td>
                  <td><strong>{r.display_name || r.label_kz || r.name}</strong></td>
                  <td>{r.users_count ?? 0}</td>
                  <td>
                    <div className="actions-cell" style={{ flexWrap: 'wrap', gap: 8 }}>
                      <Link to={`/admin/users?role_id=${r.id}`} className="ap-btn-view" style={{ textDecoration: 'none', display: 'inline-block' }}>ПАЙДАЛАНУШЫЛАР</Link>
                      <button type="button" className="ap-btn-edit" onClick={() => openEdit(r)}>ӨЗГЕРТУ</button>
                      <button type="button" className="ap-btn-del" onClick={() => remove(r)}>ЖОЮ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editOpen && (
        <div className="modal-overlay open" onClick={() => setEditOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Рөлді өңдеу</h3>
              <button type="button" className="modal-close" onClick={() => setEditOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="ap-form-label">Көрсетілетін атау (қазақша)</label>
                <input className="ap-input" value={form.label_kz} onChange={(e) => setForm((f) => ({ ...f, label_kz: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Жүйелік slug (латын)</label>
                <input className="ap-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <button type="button" className="btn btn-primary" onClick={saveEdit}>Сақтау</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

export default Roles;
