import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import Navbar from '../components/Navbar.js';
import '../../css/style.css';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeachers();
  }, []);

  useEffect(() => {
    filterTeachers();
  }, [teachers, searchTerm, categoryFilter]);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const res = await api.teachers.list('limit=100');
      if (res.success && res.data) {
        setTeachers(res.data);
      } else {
        console.error('Error loading teachers:', res.message);
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTeachers = () => {
    let filtered = teachers.filter(teacher => {
      const name = teacher.full_name || '';
      const subject = teacher.subject || '';
      const matchesSearch = !searchTerm ||
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || teacher.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
    setFilteredTeachers(filtered);
  };

  const getCategoryBadgeClass = (category) => {
    const classes = {
      'Мұғалім-сарапшы': 'badge-blue',
      'Мұғалім-зерттеуші': 'badge-purple',
      'Мұғалім-модератор': 'badge-green'
    };
    return classes[category] || 'badge-gray';
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return path;
    return `/${path}`;
  };

  return (
    <div>
      <Navbar activePage="teachers" />

      {/* Page Hero */}
      <section className="page-hero">
        <div className="animated-bg">
          <div className="float-shape shape-1"></div>
          <div className="float-shape shape-2"></div>
          <div className="float-shape shape-4"></div>
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="breadcrumb">
            <Link to="/">Басты бет</Link>
            <span className="sep"><i className="fas fa-chevron-right" style={{ fontSize: '0.6rem' }}></i></span>
            <span>Мұғалімдер</span>
          </div>
          <h1>Біздің мұғалімдер</h1>
          <p>Тәжірибелі және білікті мұғалімдер ұжымы</p>
        </div>
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, zIndex: 1 }}>
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="#f8faff" />
        </svg>
      </section>

      {/* Inner Content */}
      <section className="inner-content">
        <div className="container">
          <div className="filter-bar">
            <input
              type="text"
              className="form-control"
              id="searchInput"
              placeholder="Мұғалім іздеу..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="form-select"
              id="catFilter"
              style={{ maxWidth: '220px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Барлық санаттар</option>
              <option value="Мұғалім-сарапшы">Мұғалім-сарапшы</option>
              <option value="Мұғалім-зерттеуші">Мұғалім-зерттеуші</option>
              <option value="Мұғалім-модератор">Мұғалім-модератор</option>
            </select>
          </div>
          <div className="teachers-grid" id="teachersGrid">
            {loading ? (
              <div className="loading-spinner" style={{ gridColumn: '1/-1' }}>
                <i className="fas fa-spinner fa-spin"></i>
              </div>
            ) : filteredTeachers.length > 0 ? (
              filteredTeachers.map(teacher => (
                <Link to={`/teacher-detail?id=${teacher.id}`} key={teacher.id} className="teacher-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div className="teacher-avatar">
                    {teacher.photo_url ? (
                      <img src={getImageUrl(teacher.photo_url)} alt={teacher.full_name} loading="lazy" />
                    ) : (
                      <i className="fas fa-user-tie"></i>
                    )}
                  </div>
                  <h3>{teacher.full_name}</h3>
                  {teacher.category && (
                    <span className={`badge ${getCategoryBadgeClass(teacher.category)} teacher-category`}>
                      {teacher.category}
                    </span>
                  )}
                  <p className="teacher-subject">{teacher.subject || '—'}</p>
                  <div className="teacher-stats">
                    <div className="t-stat">
                      <span className="t-stat-num">{teacher.achievements_count || 0}</span>
                      <span className="t-stat-label">Жетістік</span>
                    </div>
                    <div className="t-stat">
                      <span className="t-stat-num">{teacher.lessons_count || 0}</span>
                      <span className="t-stat-label">Сабақ</span>
                    </div>
                    <div className="t-stat">
                      <span className="t-stat-num">{teacher.awards_count || 0}</span>
                      <span className="t-stat-label">Марапат</span>
                    </div>
                  </div>
                  {teacher.class_leadership && (
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <i className="fas fa-users"></i> Сынып жетекшісі: <strong>{teacher.class_leadership}</strong>
                    </div>
                  )}
                </Link>
              ))
            ) : (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <i className="fas fa-search"></i>
                <h3>Табылмады</h3>
                <p>Сүзгі өзгертіңіз немесе басқа атауды іздеңіз</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo">
                <i className="fas fa-graduation-cap"></i>
                <span>Ө. Жәнібеков мектебі</span>
              </div>
              <p>Білім – болашақтың кілті.</p>
              <div className="social-links">
                <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
                <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
                <a href="#" aria-label="Telegram"><i className="fab fa-telegram-plane"></i></a>
              </div>
            </div>
            <div className="footer-links">
              <h4>Навигация</h4>
              <ul>
                <li><Link to="/">Басты бет</Link></li>
                <li><Link to="/news">Жаңалықтар</Link></li>
                <li><Link to="/teachers">Мұғалімдер</Link></li>
                <li><Link to="/gallery">Галерея</Link></li>
                <li><Link to="/contact">Байланыс</Link></li>
              </ul>
            </div>
            <div className="footer-contact">
              <h4>Байланыс</h4>
              <ul>
                <li><i className="fas fa-map-marker-alt"></i> Шымкент, Жәнібеков к-сі, 12</li>
                <li><i className="fas fa-phone"></i> +7 (7252) 00-00-00</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 Ө. Жәнібеков атындағы мектеп.</p>
          </div>
        </div>
      </footer>

      <div id="toastContainer" className="toast-container"></div>
    </div>
  );
};

export default Teachers;
