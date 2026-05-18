import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

const LibraryBooks = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: '', author: '' });

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await api.library.books.list();
    if (res.success) setBooks(res.data || []);
    setLoading(false);
  };

  const openAdd = () => {
    setForm({ title: '', author: '' });
    setModal({ mode: 'add' });
  };

  const openEdit = (b) => {
    setForm({ title: b.title || '', author: b.author || '', id: b.id });
    setModal({ mode: 'edit', id: b.id });
  };

  const save = async () => {
    if (!form.title.trim()) return alert('Атауы міндетті');
    if (modal.mode === 'add') {
      const res = await api.library.books.create({ title: form.title.trim(), author: form.author.trim() || undefined, quantity: 1 });
      if (res.success) { setModal(null); load(); }
      else alert(res.message || 'Қате');
    } else {
      const res = await api.library.books.update(modal.id, { title: form.title.trim(), author: form.author.trim() || null });
      if (res.success) { setModal(null); load(); }
      else alert(res.message || 'Қате');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Кітапты жою?')) return;
    const res = await api.library.books.delete(id);
    if (res.success) load();
  };

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Кітаптар</h1>
          <p className="ap-page-sub">Кітапхана қоры</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openAdd}>+ Жаңа кітап</button>
      </div>

      <div className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Атауы</th><th>Әрекет</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3"><i className="fas fa-spinner fa-spin"></i></td></tr>
              ) : books.map((b) => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td><strong>{b.title}</strong></td>
                  <td>
                    <Link to={`/admin/library/reservations?book=${b.id}`} style={{ marginRight: 12, color: '#2563eb' }} title="Броньдар"><i className="fas fa-book"></i> Броньдар</Link>
                    <button type="button" style={{ marginRight: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => openEdit(b)} title="Өңдеу"><i className="fas fa-edit"></i> Өңдеу</button>
                    <button type="button" style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => remove(b.id)} title="Жою"><i className="fas fa-trash"></i> Жою</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ padding: 24 }}>
              <h3 style={{ marginTop: 0 }}>{modal.mode === 'add' ? 'Жаңа кітап қосу' : 'Кітапты өңдеу'}</h3>
              <div className="form-group">
                <label className="ap-form-label">Атауы *</label>
                <input className="ap-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Автор</label>
                <input className="ap-input" value={form.author || ''} onChange={(e) => setForm({ ...form, author: e.target.value })} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Бас тарту</button>
                <button type="button" className="btn btn-primary" onClick={save}>Сақтау</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

export default LibraryBooks;
