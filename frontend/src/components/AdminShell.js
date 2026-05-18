import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import '../../css/style.css';
import '../../css/admin.css';
import '../../css/admin-pro.css';

const menuGroups = [
  {
    type: 'link',
    to: '/admin/dashboard',
    icon: 'fa-tachometer-alt',
    label: 'Басты бет',
    end: true
  },
  {
    type: 'link',
    to: '/teacher-dashboard',
    icon: 'fa-chalkboard-teacher',
    label: 'Мұғалім кабинеті'
  },
  {
    type: 'sub',
    id: 'users',
    icon: 'fa-users',
    label: 'Пайдаланушылар',
    children: [
      { to: '/admin/users', label: 'Пайдаланушылар тізімі' },
      { to: '/admin/user-import', label: 'Пайдаланушылар импорты' },
      { to: '/admin/teachers', label: 'Мұғалімдер' },
      { to: '/admin/roles', label: 'Рөлдер' }
    ]
  },
  {
    type: 'sub',
    id: 'academic',
    icon: 'fa-book-open',
    label: 'Оқу үдерісі',
    children: [
      { to: '/admin/academic/classes', label: 'Сыныптар' },
      { to: '/admin/academic/subjects', label: 'Пәндер' },
      { to: '/admin/academic/classrooms', label: 'Кабинеттер' },
      { to: '/admin/academic/schedule', label: 'Кесте басқару' }
    ]
  },
  {
    type: 'sub',
    id: 'tasks',
    icon: 'fa-list-ol',
    label: 'Тапсырмалар',
    children: [
      { to: '/admin/tasks', label: 'Тапсырмалар', end: true },
      { to: '/admin/tasks/archive', label: 'Архив' }
    ]
  },
  {
    type: 'sub',
    id: 'library',
    icon: 'fa-book',
    label: 'Кітапхана',
    children: [
      { to: '/admin/library', label: 'Кітаптар', end: true },
      { to: '/admin/library/reservations', label: 'Кітап броньдары' }
    ]
  },
  {
    type: 'sub',
    id: 'attestations',
    icon: 'fa-clipboard-check',
    label: 'Аттестациялар',
    children: [
      { to: '/admin/attestations', label: 'Аттестациялар', end: true },
      { to: '/admin/attestations/types', label: 'Аттестация түрлері' }
    ]
  },
  { type: 'link', to: '/admin/attendance', icon: 'fa-user-clock', label: 'Кешігіп қалған оқушылар' },
  { type: 'link', to: '/admin/students', icon: 'fa-user-graduate', label: 'Дарынды/Үлгерімі төмен оқушылар' },
  {
    type: 'sub',
    id: 'teacherReports',
    icon: 'fa-file-alt',
    label: 'Мұғалімдердің есептері',
    children: [
      { to: '/admin/reports', label: 'Барлық есептер' },
      { to: '/admin/reports/status', label: 'Мұғалімдер статусы' }
    ],
  },
  {
    type: 'sub',
    id: 'olympiads',
    icon: 'fa-trophy',
    label: 'Олимпиада',
    children: [
      { to: '/admin/achievements', label: 'Жетістіктер' },
      { to: '/admin/olympiads/applications', label: 'Жарысқа қатысу' },
      { to: '/admin/olympiads/types', label: 'Жарыс түрлері' },
      { to: '/admin/olympiads/levels', label: 'Деңгейлер' },
      { to: '/admin/olympiads/names', label: 'Жарыс атаулары' }
    ]
  },
  {
    type: 'sub',
    id: 'events',
    icon: 'fa-calendar-alt',
    label: 'Іс-шаралар',
    children: [
      { to: '/admin/events', label: 'Іс-шаралар', end: true },
      { to: '/admin/event-types', label: 'Іс-шара түрлері' }
    ]
  },
  {
    type: 'sub',
    id: 'rating',
    icon: 'fa-chart-line',
    label: 'Рейтинг',
    children: [
      { to: '/admin/ratings', label: 'Рейтингтер', end: true },
      { to: '/admin/rating-types', label: 'Рейтинг түрлері' }
    ]
  },
  { type: 'link', to: '/admin/lesson-observations', icon: 'fa-chalkboard-teacher', label: 'Сабаққа ену', badge: '129' },
  {
    type: 'sub',
    id: 'siteManagement',
    icon: 'fa-globe',
    label: 'Сайтты басқару',
    children: [
      { to: '/admin/site/slides', label: 'Слайдтар (Hero)' },
      { to: '/admin/news', label: 'Жаңалықтар' },
      { to: '/admin/gallery', label: 'Галерея' },
      { to: '/admin/site/about', label: 'Мектеп туралы' },
      { to: '/admin/site/contacts', label: 'Байланыс ақпараты' },
      { to: '/admin/site/administration', label: 'Әкімшілік (Сайт)' }
    ]
  },
];

function pathMatchesGroup(pathname, group) {
  if (group.type !== 'sub') return false;
  return group.children.some((c) => subNavActive(pathname, c));
}

function subNavActive(pathname, ch) {
  if (ch.match === 'reportsList') {
    return pathname === '/admin/reports' || /^\/admin\/reports\/\d+$/.test(pathname);
  }
  if (ch.to === '/admin/achievements') {
    return pathname.startsWith('/admin/achievements');
  }
  return pathname === ch.to || pathname.startsWith(`${ch.to}/`);
}

export default function AdminShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(() => {
    const o = {};
    menuGroups.forEach((g) => {
      if (g.type === 'sub' && pathMatchesGroup(location.pathname, g)) o[g.id] = true;
    });
    return o;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [school, setSchool] = useState(null);

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = api.getLoginPath();
      return;
    }
    const currentUser = api.getUser();
    if (currentUser?.role === 'super_admin') {
      window.location.href = '/super-admin/dashboard';
      return;
    }
    setUser(currentUser);
    api.schoolContext().then((res) => {
      if (res.success && res.data) setSchool(res.data);
    });
  }, []);

  useEffect(() => {
    setOpen((prev) => {
      const next = { ...prev };
      menuGroups.forEach((g) => {
        if (g.type === 'sub' && pathMatchesGroup(location.pathname, g)) next[g.id] = true;
      });
      return next;
    });
  }, [location.pathname]);

  const logout = () => {
    api.removeToken();
    api.removeUser();
    api.clearOriginalSession();
    window.location.href = api.getLoginPath();
  };

  const returnToSuperAdmin = () => {
    if (api.restoreOriginalSession()) {
      navigate('/super-admin/dashboard');
      return;
    }
    window.location.href = api.getLoginPath();
  };

  const impersonating = api.isImpersonating();

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';
  const schoolName = school?.name || user?.school_name || 'Мектеп';

  if (!user) return null;

  return (
    <div className="admin-layout admin-pro">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <div className="logo-icon"><i className="fas fa-shield-alt"></i></div>
            <div className="sidebar-logo-text">
              <span className="logo-title">Әкімшілік панелі</span>
              <span className="logo-sub">{schoolName}</span>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {menuGroups.map((item) => {
            if (item.type === 'link') {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <i className={`fas ${item.icon}`}></i>
                  {item.label}
                  {item.badgeDot && <span className="badge-dot" style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />}
                  {item.badge && (
                    <span className="badge-count" style={{ background: '#ef4444' }}>{item.badge}</span>
                  )}
                </NavLink>
              );
            }
            const isOpen = open[item.id];
            const subActive = pathMatchesGroup(location.pathname, item);
            return (
              <div key={item.id}>
                <button
                  type="button"
                  className={`sidebar-link-row${isOpen || subActive ? ' open' : ''}`}
                  onClick={() => setOpen((p) => ({ ...p, [item.id]: !p[item.id] }))}
                >
                  <i className={`fas ${item.icon}`} style={{ width: 18, textAlign: 'center' }}></i>
                  {item.label}
                  <i className={`fas fa-chevron-down sidebar-chevron`} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}></i>
                </button>
                {isOpen && (
                  <div className="sidebar-submenu">
                    {item.children.map((ch) => (
                      <NavLink
                        key={ch.to}
                        to={ch.to}
                        end={ch.end}
                        className={() =>
                          `sidebar-link${subNavActive(location.pathname, ch) ? ' active' : ''}`
                        }
                        onClick={() => setSidebarOpen(false)}
                      >
                        {ch.label}
                        {ch.badgeDot && (
                          <span
                            className="badge-dot"
                            style={{
                              marginLeft: 'auto',
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: '#ef4444',
                            }}
                          />
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div>
              <div className="sidebar-user-name">{user.full_name || 'Admin'}</div>
              <div className="sidebar-user-role">Әкімші</div>
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
            <Link to="/admin/dashboard"><i className="fas fa-home"></i></Link>
            <span>/</span>
            <span>Dashboard</span>
          </div>
          <div className="ap-search-wrap">
            <i className="fas fa-search"></i>
            <input
              placeholder="Search..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQ.trim()) {
                  window.location.href = `${api.getTenantBasePath()}/admin/users?search=${encodeURIComponent(searchQ.trim())}`;
                }
              }}
            />
          </div>
          <div className="topbar-right">
            {impersonating && (
              <button
                type="button"
                className="topbar-icon-btn"
                title="Глобалдық админге қайту"
                onClick={returnToSuperAdmin}
                style={{ marginRight: 8 }}
              >
                <i className="fas fa-arrow-left"></i>
              </button>
            )}
            <button type="button" className="topbar-icon-btn" title="Хабарламалар">
              <i className="fas fa-bell"></i>
            </button>
            <div style={{ position: 'relative' }}>
              <div 
                className="ap-user-pill" 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{ cursor: 'pointer' }}
              >
                <div className="ap-user-avatar">{initials}</div>
                <span>{user.full_name || 'Admin User'}</span>
                <i className="fas fa-chevron-down" style={{ fontSize: '0.65rem', color: '#94a3b8' }}></i>
              </div>
              
              {userMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  background: 'var(--ap-card)',
                  border: '1px solid var(--ap-border)',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  minWidth: '200px',
                  zIndex: 50,
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ap-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '0.9rem' }}>{user.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user.email || 'Әкімшілік рөл'}</div>
                  </div>
                  <div style={{ padding: '8px' }}>
                    <Link to="/profile" className="user-menu-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#cbd5e1', textDecoration: 'none', borderRadius: '6px', fontSize: '0.85rem' }} onClick={() => setUserMenuOpen(false)}>
                      <i className="fas fa-user-circle" style={{ width: '16px' }}></i> Профиль
                    </Link>
                    <a href={api.getTenantBasePath() || '/'} target="_blank" rel="noreferrer" className="user-menu-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#cbd5e1', textDecoration: 'none', borderRadius: '6px', fontSize: '0.85rem' }} onClick={() => setUserMenuOpen(false)}>
                      <i className="fas fa-home" style={{ width: '16px' }}></i> Басты бетке өту (Сайт)
                    </a>
                  </div>
                  <div style={{ padding: '8px', borderTop: '1px solid var(--ap-border)' }}>
                    <button onClick={logout} className="user-menu-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <i className="fas fa-sign-out-alt" style={{ width: '16px' }}></i> Жүйеден шығу
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </main>
      <div id="toastContainer" className="toast-container"></div>
    </div>
  );
}
