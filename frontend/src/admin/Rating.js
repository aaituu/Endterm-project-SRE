import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import '../../css/style.css';
import '../../css/admin.css';
import '../../css/admin-pro.css';

const Rating = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    const currentUser = api.getUser();
    setUser(currentUser);
  }, []);

  const logout = () => {
    api.removeToken();
    api.removeUser();
    window.location.href = '/login';
  };

  if (!user) return null;

  return (
    <div className="admin-layout admin-pro">
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
            <Link to="/admin/library" className="sidebar-link">
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
            <Link to="/admin/rating" className="sidebar-link active">
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
            <div className="topbar-title">Рейтинг</div>
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
              <h1>Рейтинг жүйесі</h1>
              <p>Мұғалімдер мен оқушылардың рейтингін басқару</p>
            </div>
          </div>

          <div className="data-table-card">
            <div className="data-table-header">
              <h3><i className="fas fa-star" style={{color:'var(--primary)'}}></i> Рейтинг</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Орын</th>
                    <th>Аты-жөні</th>
                    <th>Рейтинг</th>
                    <th>Категория</th>
                    <th>Өзгеріс</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state">
                        <i className="fas fa-star"></i>
                        <h3>Рейтинг мәліметтері жоқ</h3>
                      </div>
                    </td>
                  </tr>
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

export default Rating;
