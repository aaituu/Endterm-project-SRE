import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api.js';

/**
 * Shared Navbar component for all public pages.
 * Handles dropdown with smooth scroll (on Home) or navigate+hash (on other pages).
 */
export default function Navbar({ activePage = '' }) {
  const [navbarScrolled, setNavbarScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [school, setSchool] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    setUser(api.getUser());
    api.schoolContext().then((res) => {
      if (res.success && res.data) setSchool(res.data);
    });
    const handleScroll = () => setNavbarScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // After navigating to home, scroll to hash if present
  useEffect(() => {
    if (location.pathname === '/' && location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [location]);

  const handleAnchorClick = (e, sectionId) => {
    e.preventDefault();
    setNavOpen(false);
    if (isHome) {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate(`/#${sectionId}`);
    }
  };

  const dashboardPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'super_admin':
        return '/super-admin/dashboard';
      case 'admin':
        return '/admin/dashboard';
      case 'teacher': return '/teacher-dashboard';
      case 'student': return '/student-dashboard';
      case 'parent': return '/parent-dashboard';
      case 'librarian': return '/librarian-dashboard';
      case 'director': return '/director-dashboard';
      default: return '/staff-dashboard';
    }
  };

  const logout = () => {
    api.removeToken();
    api.removeUser();
    window.location.href = '/';
  };

  const schoolName = school?.name || user?.school_name || 'Мектеп';

  return (
    <nav className={`navbar ${navbarScrolled ? 'scrolled' : ''}`} id="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <div className="logo-icon"><i className="fas fa-graduation-cap"></i></div>
          <div className="logo-text">
            <span className="logo-title">{schoolName}</span>
            <span className="logo-sub">мектеп платформасы</span>
          </div>
        </Link>

        <ul className={`nav-links ${navOpen ? 'open' : ''}`} id="navLinks">
          <li>
            <Link to="/" className={`nav-link ${activePage === 'home' ? 'active' : ''}`}>
              Басты бет
            </Link>
          </li>
          <li className="dropdown">
            <a
              href="#about"
              className="nav-link"
              onClick={(e) => handleAnchorClick(e, 'about')}
            >
              Мектеп туралы <i className="fas fa-chevron-down"></i>
            </a>
            <div className="dropdown-menu">
              <a href="#about" onClick={(e) => handleAnchorClick(e, 'about')}>
                <i className="fas fa-school"></i> Мектеп туралы
              </a>
              <Link to="/administration" onClick={() => setNavOpen(false)}>
                <i className="fas fa-users-tie"></i> Әкімшілік
              </Link>
              <a href="#programs" onClick={(e) => handleAnchorClick(e, 'programs')}>
                <i className="fas fa-book-open"></i> Оқу бағдарламасы
              </a>
              <a href="#history" onClick={(e) => handleAnchorClick(e, 'history')}>
                <i className="fas fa-landmark"></i> Мектеп тарихы
              </a>
            </div>
          </li>
          <li>
            <Link to="/news" className={`nav-link ${activePage === 'news' ? 'active' : ''}`} onClick={() => setNavOpen(false)}>
              Жаңалықтар
            </Link>
          </li>
          <li>
            <Link to="/teachers" className={`nav-link ${activePage === 'teachers' ? 'active' : ''}`} onClick={() => setNavOpen(false)}>
              Мұғалімдер
            </Link>
          </li>
          <li>
            <Link to="/gallery" className={`nav-link ${activePage === 'gallery' ? 'active' : ''}`} onClick={() => setNavOpen(false)}>
              Фотогалерея
            </Link>
          </li>
          <li>
            <Link to="/contact" className={`nav-link ${activePage === 'contact' ? 'active' : ''}`} onClick={() => setNavOpen(false)}>
              Байланыс
            </Link>
          </li>
        </ul>

        <div className="nav-actions">
          <div id="authBtnArea">
            {user && api.isLoggedIn() ? (
              <div className="nav-user-btn">
                <Link to={dashboardPath()} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }} onClick={() => setNavOpen(false)}>
                  <div className="nav-user-avatar">
                    {user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                  </div>
                  <span>{user.full_name?.split(' ')[0] || 'Пайдаланушы'}</span>
                </Link>
                <i className="fas fa-chevron-down" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}></i>
                <div className="nav-user-dropdown">
                  {['admin', 'super_admin'].includes(user.role) ? (
                    <Link to={dashboardPath()} onClick={() => setNavOpen(false)}><i className="fas fa-tachometer-alt"></i> Басқару панелі</Link>
                  ) : (
                    <Link to={dashboardPath()} onClick={() => setNavOpen(false)}><i className="fas fa-home"></i> Менің кабинет</Link>
                  )}
                {user.role !== 'super_admin' && (
                  <Link to="/profile" onClick={() => setNavOpen(false)}><i className="fas fa-user-circle"></i> Профиль өзгерту</Link>
                )}
                <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} style={{ color: 'var(--danger)' }}>
                  <i className="fas fa-sign-out-alt"></i> Шығу
                </a>
                </div>
              </div>
            ) : (
              <Link to={api.getLoginPath()} className="btn btn-primary btn-sm" id="loginBtn">
                <i className="fas fa-sign-in-alt"></i> Кіру
              </Link>
            )}
          </div>
          <button className="hamburger" id="hamburger" onClick={() => setNavOpen(!navOpen)} aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </nav>
  );
}
