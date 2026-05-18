import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import api from '../utils/api.js';
import '../../css/style.css';
import '../../css/admin.css';
import '../../css/admin-pro.css';

const menu = [
  { to: '/super-admin/dashboard', icon: 'fa-tachometer-alt', label: 'Жалпы бақылау' },
  { to: '/super-admin/schools', icon: 'fa-school', label: 'Мектептер' },
  { to: '/super-admin/site-builder', icon: 'fa-cubes', label: 'Сайт құралы' },
  { to: '/super-admin/analytics', icon: 'fa-chart-line', label: 'Аналитика' },
  { to: '/super-admin/support', icon: 'fa-headset', label: 'Қолдау' },
  { to: '/super-admin/logs', icon: 'fa-history', label: 'Аудит журналдары' },
  { to: '/super-admin/plans', icon: 'fa-wallet', label: 'Жоспарлар' }
];

export default function SuperAdminShell({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isSuperAdmin()) {
      window.location.href = api.getLoginPath();
      return;
    }
    setUser(api.getUser());
  }, []);

  const logout = () => {
    api.removeToken();
    api.removeUser();
    window.location.href = api.getLoginPath();
  };

  if (!user) return null;

  const initials = user.full_name ? user.full_name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : 'SA';

  return (
    <div className="admin-layout admin-pro">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <div className="logo-icon"><i className="fas fa-globe"></i></div>
            <div className="sidebar-logo-text">
              <span className="logo-title">Global Super Admin</span>
              <span className="logo-sub">SaaS басқару</span>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <i className={`fas ${item.icon}`}></i>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div>
              <div className="sidebar-user-name">{user.full_name}</div>
              <div className="sidebar-user-role">super_admin</div>
            </div>
            <button type="button" className="sidebar-logout" onClick={logout} title="Шығу">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="topbar-icon-btn admin-mobile-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <i className="fas fa-bars"></i>
          </button>
          <div className="ap-breadcrumb">
            <Link to="/super-admin/dashboard"><i className="fas fa-home"></i></Link>
            <span>/</span>
            <span>Global Admin</span>
          </div>
          <div className="topbar-right">
            <div className="ap-user-pill">
              <div className="ap-user-avatar">{initials}</div>
              <span>{user.full_name || 'Super Admin'}</span>
            </div>
            <button type="button" className="topbar-icon-btn" title="Шығу" onClick={logout}>
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </main>
      <div id="toastContainer" className="toast-container"></div>
    </div>
  );
}
