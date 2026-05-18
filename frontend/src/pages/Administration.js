import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { getImageUrl } from '../utils/api.js';
import Navbar from '../components/Navbar.js';
import '../../css/style.css';

const Administration = () => {
  const [administration, setAdministration] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navbarScrolled, setNavbarScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [school, setSchool] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setNavbarScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const currentUser = api.getUser();
    setUser(currentUser);
    api.schoolContext().then((res) => {
      if (res.success && res.data) setSchool(res.data);
    });
  }, []);

  useEffect(() => {
    loadAdministration();
  }, []);

  const loadAdministration = async () => {
    try {
      const res = await api.admin.list();
      setAdministration(res.success ? (res.data || []) : []);
    } catch (error) {
      console.error('Error loading administration:', error);
      setAdministration([]);
    } finally {
      setLoading(false);
    }
  };

  const schoolName = school?.name || 'Мектеп';

  return (
    <div>
      <Navbar activePage="" />

      {/* Page Hero */}
      <section className="page-hero">
        <div className="animated-bg">
          <div className="float-shape shape-1"></div>
          <div className="float-shape shape-3"></div>
          <div className="float-shape shape-5"></div>
        </div>
        <div className="container" style={{position:'relative', zIndex:1}}>
          <div className="breadcrumb">
            <Link to="/">Басты бет</Link>
            <span className="sep"><i className="fas fa-chevron-right" style={{fontSize:'0.6rem'}}></i></span>
            <span>Мектеп туралы</span>
            <span className="sep"><i className="fas fa-chevron-right" style={{fontSize:'0.6rem'}}></i></span>
            <span>Әкімшілік</span>
          </div>
          <h1>Әкімшілік</h1>
          <p>{schoolName} басшылығы</p>
        </div>
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{position:'absolute', bottom:'-1px', left:0, right:0, zIndex:1}}>
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="#f8faff"/>
        </svg>
      </section>

      {/* Inner Content */}
      <section className="inner-content">
        <div className="container">
          <div className="administration-grid" id="administrationGrid">
            {loading ? (
              <div className="loading-spinner" style={{gridColumn:'1/-1'}}>
                <i className="fas fa-spinner fa-spin"></i>
              </div>
            ) : administration.length > 0 ? (
              administration.map((admin) => (
                <div key={admin.id} className="admin-card">
                  <div className="admin-avatar">
                    {(admin.photo_url || admin.image_url) ? (
                      <img src={getImageUrl(admin.photo_url || admin.image_url)} alt={admin.full_name} onError={(e) => { e.target.style.display='none'; }} />
                    ) : (
                      <div className="avatar-placeholder">
                        {admin.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="admin-info">
                    <h3>{admin.full_name}</h3>
                    <div className="admin-position">{admin.position}</div>
                    <p className="admin-description">{admin.description}</p>
                    <div className="admin-contact">
                      {admin.phone && (
                        <div className="contact-item">
                          <i className="fas fa-phone"></i>
                          <span>{admin.phone}</span>
                        </div>
                      )}
                      {admin.email && (
                        <div className="contact-item">
                          <i className="fas fa-envelope"></i>
                          <span>{admin.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{gridColumn:'1/-1'}}>
                <i className="fas fa-users-tie"></i>
                <h3>Әкімшілік туралы ақпарат жоқ</h3>
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
                <span>{schoolName}</span>
              </div>
              <p>Білім – болашақтың кілті.</p>
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
            <p>&copy; 2024 {schoolName}.</p>
          </div>
        </div>
      </footer>

      <div id="toastContainer" className="toast-container"></div>
    </div>
  );
};

export default Administration;
