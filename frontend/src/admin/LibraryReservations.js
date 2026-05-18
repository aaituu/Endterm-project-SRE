import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

const LibraryReservations = () => {
  const [searchParams] = useSearchParams();
  const preBook = searchParams.get('book');

  const [rows, setRows] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listSearch, setListSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    book_id: preBook || '',
    user_search: '',
    user_id: '',
    borrow_date: new Date().toISOString().slice(0, 10),
    return_date: new Date().toISOString().slice(0, 10),
    status: 'issued'
  });
  const [foundUsers, setFoundUsers] = useState([]);

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const q = listSearch.trim() ? `search=${encodeURIComponent(listSearch.trim())}` : '';
    const [rRes, bRes] = await Promise.all([
      api.library.reservations.list(q),
      api.library.books.list()
    ]);
    if (rRes.success) setRows(rRes.data || []);
    if (bRes.success) setBooks(bRes.data || []);
    setLoading(false);
  };

  const searchUsers = async (value) => {
    setForm((p) => ({ ...p, user_search: value, user_id: '' }));
    if (!value || value.length < 2) {
      setFoundUsers([]);
      return;
    }
    const res = await api.library.reservations.searchUsers(value);
    setFoundUsers(res.success ? res.data || [] : []);
  };

  const saveReservation = async () => {
    if (!form.book_id || !form.user_id) {
      alert('Кітап пен пайдаланушы міндетті');
      return;
    }
    const res = await api.library.reservations.create({
      book_id: Number(form.book_id),
      user_id: Number(form.user_id),
      borrow_date: form.borrow_date,
      return_date: form.return_date,
      status: form.status
    });
    if (res.success) {
      setModal(false);
      setForm({
        book_id: preBook || '',
        user_search: '',
        user_id: '',
        borrow_date: new Date().toISOString().slice(0, 10),
        return_date: new Date().toISOString().slice(0, 10),
        status: 'issued'
      });
      setFoundUsers([]);
      load();
    } else alert(res.message || 'Қате');
  };

  const doReturn = async (id) => {
    const res = await api.library.reservations.return(id);
    if (res.success) load();
  };

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Кітап броньдары</h1>
          <p className="ap-page-sub">Броньдар мен қайтару</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="ap-input" style={{ minWidth: 200 }} placeholder="Іздеу: кітап, пайдалану..." value={listSearch} onChange={(e) => setListSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          <button type="button" className="btn btn-primary" onClick={load}><i className="fas fa-search"></i></button>
          <button type="button" className="btn btn-primary" onClick={() => { setModal(true); setForm((p) => ({ ...p, book_id: preBook || p.book_id })); }}>Жаңа бронь қосу</button>
          <Link to="/admin/library" className="btn btn-secondary">Кітаптар</Link>
        </div>
      </div>

      <div className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Кітап</th><th>Пайдаланушы</th><th>Берілген</th><th>Қайтару</th><th>Статус</th><th>Әрекет</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7"><i className="fas fa-spinner fa-spin"></i></td></tr>
              ) : rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.book_title || '—'}</td>
                  <td>{r.user_name || '—'}</td>
                  <td>{r.borrow_date ? new Date(r.borrow_date).toLocaleDateString('kk-KZ') : (r.created_at ? new Date(r.created_at).toLocaleDateString('kk-KZ') : '—')}</td>
                  <td>{r.return_date ? new Date(r.return_date).toLocaleDateString('kk-KZ') : '—'}</td>
                  <td>
                    {r.status === 'returned' || r.actual_return_date ? (
                      <span className="badge badge-green"><i className="fas fa-check"></i> Қайтарылды</span>
                    ) : (
                      <span className="badge badge-gray"><i className="fas fa-clock"></i> Берілді</span>
                    )}
                  </td>
                  <td>
                    {!(r.status === 'returned' || r.actual_return_date) && (
                      <button type="button" className="btn btn-sm btn-success" title="Қайтару" onClick={() => doReturn(r.id)}><i className="fas fa-sync-alt"></i></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ padding: 24 }}>
              <h3 style={{ marginTop: 0 }}>Жаңа бронь қосу</h3>
              <div className="form-group">
                <label className="ap-form-label">Кітап *</label>
                <select className="ap-input" value={form.book_id} onChange={(e) => setForm({ ...form, book_id: e.target.value })}>
                  <option value="">Таңдаңыз</option>
                  {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Пайдаланушы *</label>
                <input className="ap-input" placeholder="Аты немесе ИИН" value={form.user_search} onChange={(e) => searchUsers(e.target.value)} />
                {foundUsers.length > 0 && (
                  <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 8, maxHeight: 120, overflow: 'auto' }}>
                    {foundUsers.map((u) => (
                      <button
                        type="button"
                        key={u.id}
                        className="btn"
                        style={{ width: '100%', textAlign: 'left', borderRadius: 0 }}
                        onClick={() => { setForm((p) => ({ ...p, user_id: String(u.id), user_search: `${u.full_name} (${u.iin || '—'})` })); setFoundUsers([]); }}
                      >
                        {u.full_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="ap-form-label">Бронь күні *</label>
                <input className="ap-input" type="date" value={form.borrow_date} onChange={(e) => setForm({ ...form, borrow_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Аяқталу күні *</label>
                <input className="ap-input" type="date" value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Статус *</label>
                <select className="ap-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="issued">Берілді</option>
                  <option value="reserved">Броньда</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Бас тарту</button>
                <button type="button" className="btn btn-primary" onClick={saveReservation}>Сақтау</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

export default LibraryReservations;
