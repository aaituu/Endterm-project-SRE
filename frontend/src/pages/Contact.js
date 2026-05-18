import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { getImageUrl } from '../utils/api.js';
import Navbar from '../components/Navbar.js';
import '../../css/style.css';

const Contact = () => {
  const [navbarScrolled, setNavbarScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [contactInfo, setContactInfo] = useState({
    address: 'Шымкент қаласы, Жәнібеков көшесі, 12',
    phone: '+7 (7252) 00-00-00',
    email: 'info@zhanibekov.kz',
    hours: 'Дүйсенбі - Жұма: 8:00 - 18:00\nСенбі: 9:00 - 15:00'
  });
  const [loading, setLoading] = useState(false);
  const [infoLoading, setInfoLoading] = useState(true);

  useEffect(() => {
    const loadContactInfo = async () => {
      try {
        const res = await api.siteContent.listAll('contacts');
        if (res.success && res.data) {
          const info = { ...contactInfo };
          res.data.forEach(item => {
            if (item.content_key) {
               // Allow fallback if empty
               if (item.body) info[item.content_key] = item.body;
            }
          });
          setContactInfo(info);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setInfoLoading(false);
      }
    };
    loadContactInfo();
  }, []);

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
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.contact.send(formData);
      if (res.success) {
        showToast('Хабарлама жіберілді!', 'success');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        showToast('Қате: ' + (res.message || 'Хабарламаны жіберу мүмкін болмады'), 'error');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      showToast('Қате: Хабарламаны жіберу мүмкін болмады', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    `;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  };

  const logout = () => {
    api.removeToken();
    api.removeUser();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <div>
      <Navbar activePage="contact" />

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
            <span>Байланыс</span>
          </div>
          <h1>Байланыс</h1>
          <p>Бізбен байланысыңыз</p>
        </div>
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{position:'absolute', bottom:'-1px', left:0, right:0, zIndex:1}}>
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="#f8faff"/>
        </svg>
      </section>

      {/* Inner Content */}
      <section className="inner-content">
        <div className="container">
          <div className="contact-grid">
            {/* Contact Info */}
            {/* Contact Info */}
            <div className="contact-info-card">
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: '24px' }}>Байланыс ақпараты</h3>
              
              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <i className="fas fa-map-marker-alt"></i>
                </div>
                <div>
                  <div className="contact-info-label">Мекен-жай</div>
                  <div className="contact-info-val" style={{ whiteSpace: 'pre-line' }}>{contactInfo.address}</div>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <i className="fas fa-phone"></i>
                </div>
                <div>
                  <div className="contact-info-label">Телефон</div>
                  <div className="contact-info-val" style={{ whiteSpace: 'pre-line' }}>{contactInfo.phone}</div>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <div>
                  <div className="contact-info-label">Email</div>
                  <div className="contact-info-val" style={{ whiteSpace: 'pre-line' }}>{contactInfo.email}</div>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div>
                  <div className="contact-info-label">Жұмыс уақыты</div>
                  <div className="contact-info-val" style={{ whiteSpace: 'pre-line' }}>{contactInfo.hours}</div>
                </div>
              </div>

              {/* Dynamic Map */}
              <div className="map-container" style={{ marginTop: '30px', borderRadius: 'var(--radius)', overflow: 'hidden', height: '300px' }}>
                <iframe
                  title="Мектеп картасы"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(contactInfo.address)}&hl=kk&z=14&output=embed`}
                ></iframe>
              </div>
            </div>

            {/* Contact Form */}
            {/* Contact Form */}
            <div className="contact-form-card">
              <h3>Хабарлама жіберу</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name" className="form-label">Аты-жөні *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="form-control"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Аты-жөніңізді енгізіңіз"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="subject" className="form-label">Тақырып *</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    className="form-control"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    placeholder="Хабарлама тақырыбы"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="message" className="form-label">Хабарлама *</label>
                  <textarea
                    id="message"
                    name="message"
                    className="form-control"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows="6"
                    placeholder="Хабарламаңызды жазыңыз..."
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Жіберілуде...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i> Жіберу
                    </>
                  )}
                </button>
              </form>
            </div>
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

export default Contact;
