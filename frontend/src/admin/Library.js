import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import '../../css/style.css';
import '../../css/admin.css';

const Library = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookForm, setBookForm] = useState({ title: '', author: '', quantity: 1 });
  const [reservationForm, setReservationForm] = useState({ book_id: '', user_search: '', user_id: '', due_date: '' });
  const [foundUsers, setFoundUsers] = useState([]);
  const [searchBook, setSearchBook] = useState('');

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    const currentUser = api.getUser();
    setUser(currentUser);
    loadData();
  }, []);

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i><span>${message}</span>`;
    const tc = document.getElementById('toastContainer');
    if (tc) tc.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [booksRes, reservationsRes] = await Promise.all([
        api.library.books.list(),
        api.library.reservations.list()
      ]);
      if (booksRes.success) setBooks(booksRes.data || []);
      if (reservationsRes.success) setReservations(reservationsRes.data || []);
    } catch (e) {
      console.error(e);
      showToast('Кітапхана деректері жүктелмеді', 'error');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (value) => {
    setReservationForm((prev) => ({ ...prev, user_search: value, user_id: '' }));
    if (!value || value.length < 2) {
      setFoundUsers([]);
      return;
    }
    const res = await api.library.reservations.searchUsers(value);
    setFoundUsers(res.success ? res.data || [] : []);
  };

  const addBook = async () => {
    if (!bookForm.title.trim()) return showToast('Кітап атауын толтырыңыз', 'error');
    const res = await api.library.books.create({
      title: bookForm.title.trim(),
      author: bookForm.author.trim(),
      quantity: Number(bookForm.quantity) || 1
    });
    if (!res.success) return showToast(res.message || 'Кітап қосылмады', 'error');
    setBookForm({ title: '', author: '', quantity: 1 });
    showToast('Кітап қосылды', 'success');
    loadData();
  };

  const addReservation = async () => {
    if (!reservationForm.book_id || !reservationForm.user_id) {
      return showToast('Бронь үшін кітап пен пайдаланушыны таңдаңыз', 'error');
    }
    const res = await api.library.reservations.create({
      book_id: Number(reservationForm.book_id),
      user_id: Number(reservationForm.user_id),
      due_date: reservationForm.due_date || null
    });
    if (!res.success) return showToast(res.message || 'Бронь сақталмады', 'error');
    setReservationForm({ book_id: '', user_search: '', user_id: '', due_date: '' });
    setFoundUsers([]);
    showToast('Бронь қосылды', 'success');
    loadData();
  };

  const returnReservation = async (id) => {
    const res = await api.library.reservations.return(id);
    if (!res.success) return showToast(res.message || 'Қайтару орындалмады', 'error');
    showToast('Кітап қайтарылды', 'success');
    loadData();
  };

  const logout = () => {
    api.removeToken();
    api.removeUser();
    window.location.href = '/login';
  };

  if (!user) return null;

  return (
    <div className="admin-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <div className="logo-icon"><i className="fas fa-graduation-cap"></i></div>
            <div className="sidebar-logo-text">
              <span className="logo-title">Ө. Жәнібеков</span>
              <span className="logo-sub">Басқару панелі</span>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <span className="nav-section-label">Негізгі</span>
            <Link to="/admin/dashboard" className="sidebar-link">
              <i className="fas fa-tachometer-alt"></i> Басқару тақтасы
            </Link>
            <a href="/" className="sidebar-link" target="_blank">
              <i className="fas fa-external-link-alt"></i> Сайтты көру
            </a>
          </div>
          <div className="nav-section">
            <span className="nav-section-label">Пайдаланушылар</span>
            <Link to="/admin/users" className="sidebar-link">
              <i className="fas fa-users"></i> Пайдаланушылар
            </Link>
            <Link to="/admin/roles" className="sidebar-link">
              <i className="fas fa-user-shield"></i> Рөлдер
            </Link>
          </div>
          <div className="nav-section">
            <span className="nav-section-label">Оқу үдерісі</span>
            <Link to="/admin/academic" className="sidebar-link">
              <i className="fas fa-school"></i> Оқу үдерісі
            </Link>
            <Link to="/admin/tasks" className="sidebar-link">
              <i className="fas fa-tasks"></i> Тапсырмалар
            </Link>
            <Link to="/admin/library" className="sidebar-link active">
              <i className="fas fa-book"></i> Кітапхана
            </Link>
            <Link to="/admin/attendance" className="sidebar-link">
              <i className="fas fa-clock"></i> Кешіккендер
            </Link>
            <Link to="/admin/reports" className="sidebar-link">
              <i className="fas fa-file-alt"></i> Есептер
            </Link>
          </div>
          <div className="nav-section">
            <span className="nav-section-label">Қосымша</span>
            <Link to="/admin/students" className="sidebar-link">
              <i className="fas fa-user-graduate"></i> Оқушылар
            </Link>
            <Link to="/admin/olympiads" className="sidebar-link">
              <i className="fas fa-trophy"></i> Олимпиадалар
            </Link>
            <Link to="/admin/events" className="sidebar-link">
              <i className="fas fa-calendar-check"></i> Іс-шаралар
            </Link>
            <Link to="/admin/attestations" className="sidebar-link">
              <i className="fas fa-certificate"></i> Аттестациялар
            </Link>
            <Link to="/admin/stats" className="sidebar-link">
              <i className="fas fa-chart-bar"></i> Статистика
            </Link>
            <Link to="/admin/rating" className="sidebar-link">
              <i className="fas fa-star"></i> Рейтинг
            </Link>
          </div>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'A'}
            </div>
            <div>
              <div className="sidebar-user-name">{user.full_name || 'Администратор'}</div>
              <div className="sidebar-user-role">{user.role === 'admin' ? 'Администратор' : user.role}</div>
            </div>
            <button className="sidebar-logout" onClick={logout}>
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <button
              className="topbar-icon-btn"
              style={{display: window.innerWidth <= 900 ? 'flex' : 'none'}}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <i className="fas fa-bars"></i>
            </button>
            <div className="topbar-title">Кітапхана</div>
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn" onClick={logout}>
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </header>

        <div className="admin-content">
          <div className="admin-page-header">
            <div>
              <h1>Кітапхананы басқару</h1>
              <p>Кітап қоры және броньдер тізімі</p>
            </div>
          </div>

          <div className="form-panel">
            <h3>Кітап қосу</h3>
            <div className="form-grid">
              <div className="form-group"><label className="ap-form-label">Кітап атауы</label><input className="ap-input" value={bookForm.title} onChange={(e) => setBookForm((p) => ({ ...p, title: e.target.value }))} /></div>
              <div className="form-group"><label className="ap-form-label">Автор</label><input className="ap-input" value={bookForm.author} onChange={(e) => setBookForm((p) => ({ ...p, author: e.target.value }))} /></div>
              <div className="form-group"><label className="ap-form-label">Саны</label><input className="ap-input" type="number" min="1" value={bookForm.quantity} onChange={(e) => setBookForm((p) => ({ ...p, quantity: e.target.value }))} /></div>
            </div>
            <div className="form-actions"><button className="btn btn-primary" onClick={addBook}>Сақтау</button></div>
          </div>

          <div className="data-table-card">
            <div className="data-table-header">
              <h3><i className="fas fa-book" style={{color:'var(--primary)'}}></i> Кітапхана қоры</h3>
              <input className="ap-input" style={{ maxWidth: 220 }} placeholder="Кітап іздеу..." value={searchBook} onChange={(e) => setSearchBook(e.target.value)} />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Атауы</th>
                    <th>Автор</th>
                    <th>Саны</th>
                    <th>Күйі</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5"><div className="loading-spinner"><i className="fas fa-spinner fa-spin"></i></div></td></tr>
                  ) : books.filter((b) => !searchBook || b.title?.toLowerCase().includes(searchBook.toLowerCase())).map((b) => (
                    <tr key={b.id}>
                      <td>{b.id}</td><td>{b.title}</td><td>{b.author || '—'}</td><td>{b.quantity || 0}</td><td>{(b.quantity || 0) > 0 ? 'Бар' : 'Жоқ'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="form-panel" style={{ marginTop: 16 }}>
            <h3>Бронь қосу</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="ap-form-label">Кітап</label>
                <select className="ap-input" value={reservationForm.book_id} onChange={(e) => setReservationForm((p) => ({ ...p, book_id: e.target.value }))}>
                  <option value="">Кітап таңдаңыз</option>
                  {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Пайдаланушы (ФИО/ИИН)</label>
                <input className="ap-input" value={reservationForm.user_search} onChange={(e) => searchUsers(e.target.value)} />
                {foundUsers.length > 0 && (
                  <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 8, maxHeight: 150, overflow: 'auto' }}>
                    {foundUsers.map((u) => (
                      <button
                        key={u.id}
                        className="btn"
                        style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start', borderRadius: 0 }}
                        onClick={() => setReservationForm((p) => ({ ...p, user_id: String(u.id), user_search: `${u.full_name} (${u.iin || '—'})` }))}
                      >
                        {u.full_name} - {u.iin || '—'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group"><label className="ap-form-label">Қайтару күні</label><input className="ap-input" type="date" value={reservationForm.due_date} onChange={(e) => setReservationForm((p) => ({ ...p, due_date: e.target.value }))} /></div>
            </div>
            <div className="form-actions"><button className="btn btn-primary" onClick={addReservation}>Бронь сақтау</button></div>
          </div>

          <div className="data-table-card" style={{ marginTop: 16 }}>
            <div className="data-table-header">
              <h3><i className="fas fa-clipboard-list" style={{ color: 'var(--primary)' }}></i> Броньдер тізімі</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>ID</th><th>Кітап</th><th>Пайдаланушы</th><th>Берілген күні</th><th>Қайтару күні</th><th>Күйі</th><th></th></tr>
                </thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.book_title || r.title || '—'}</td>
                      <td>{r.user_name || r.full_name || '—'}</td>
                      <td>{r.borrowed_at ? new Date(r.borrowed_at).toLocaleDateString('kk-KZ') : '—'}</td>
                      <td>{r.due_date ? new Date(r.due_date).toLocaleDateString('kk-KZ') : '—'}</td>
                      <td>{r.returned_at ? 'Қайтарылған' : 'Берілген'}</td>
                      <td>{!r.returned_at && <button className="btn btn-sm btn-primary" onClick={() => returnReservation(r.id)}>Қайтару</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <div id="toastContainer" className="toast-container"></div>
    </div>
  );
};

export default Library;