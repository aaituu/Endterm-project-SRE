import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { getImageUrl } from '../utils/api.js';
import Navbar from '../components/Navbar.js';
import '../../css/style.css';

const Gallery = () => {
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navbarScrolled, setNavbarScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState('');
  const [lightboxDesc, setLightboxDesc] = useState('');

  // Placeholder items for demo
  const PLACEHOLDER_ITEMS = [
    { id: 'p1', description: 'Мектептің негізгі ғимараты', image_url: null },
    { id: 'p2', description: 'Оқушылар спорт залда', image_url: null },
    { id: 'p3', description: 'Ғылым күні іс-шарасы', image_url: null },
    { id: 'p4', description: 'Наурыз мерекесі', image_url: null },
    { id: 'p5', description: 'Кітапхана', image_url: null },
    { id: 'p6', description: 'Информатика кабинеті', image_url: null },
  ];

  const PLACEHOLDER_ICONS = ['fa-school','fa-dumbbell','fa-flask','fa-star','fa-book','fa-laptop'];

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

  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    try {
      const res = await api.gallery.list();
      let items = (res.success && res.data?.length) ? res.data : PLACEHOLDER_ITEMS;
      setGalleryItems(items);
    } catch (error) {
      console.error('Error loading gallery:', error);
      setGalleryItems(PLACEHOLDER_ITEMS);
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = (url, desc) => {
    setLightboxImage(url);
    setLightboxDesc(desc);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const logout = () => {
    api.removeToken();
    api.removeUser();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <div>
      <Navbar activePage="gallery" />

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
            <span>Фотогалерея</span>
          </div>
          <h1>Фотогалерея</h1>
          <p>Мектеп өмірінен алынған сәттер</p>
        </div>
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{position:'absolute', bottom:'-1px', left:0, right:0, zIndex:1}}>
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="#f8faff"/>
        </svg>
      </section>

      {/* Inner Content */}
      <section className="inner-content">
        <div className="container">
          <div className="gallery-grid" id="galleryGrid">
            {loading ? (
              <div className="loading-spinner" style={{gridColumn:'1/-1'}}>
                <i className="fas fa-spinner fa-spin"></i>
              </div>
            ) : galleryItems.length > 0 ? (
              galleryItems.map((item, idx) => (
                item.image_url ? (
                  <div
                    key={item.id}
                    className="gallery-item"
                    onClick={() => openLightbox(getImageUrl(item.image_url), item.description || '')}
                  >
                    <img src={getImageUrl(item.image_url)} alt={item.description || ''} loading="lazy" />
                    <div className="gallery-overlay">
                      <span>{item.description || ''}</span>
                    </div>
                  </div>
                ) : (
                  <div
                    key={item.id}
                    className="gallery-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: '12px',
                      background: 'var(--bg-3)'
                    }}
                  >
                    <i
                      className={`fas ${PLACEHOLDER_ICONS[idx % PLACEHOLDER_ICONS.length]}`}
                      style={{fontSize: '3rem', color: 'var(--primary)', opacity: 0.4}}
                    ></i>
                    <span style={{fontSize: '0.82rem', color: 'var(--text-muted)', padding: '0 20px', textAlign: 'center'}}>
                      {item.description || ''}
                    </span>
                  </div>
                )
              ))
            ) : (
              <div className="empty-state" style={{gridColumn:'1/-1'}}>
                <i className="fas fa-images"></i>
                <h3>Фото жоқ</h3>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="modal-overlay open" id="lightbox" onClick={closeLightbox}>
          <div className="modal" style={{maxWidth: '900px', background: '#000'}}>
            <button
              className="modal-close"
              id="lightboxClose"
              style={{position: 'absolute', top: '12px', right: '16px', color: '#fff', fontSize: '1.5rem', zIndex: 10}}
              onClick={closeLightbox}
            >
              <i className="fas fa-times"></i>
            </button>
            <img
              id="lightboxImg"
              src={lightboxImage}
              alt=""
              style={{width: '100%', maxHeight: '85vh', objectFit: 'contain', display: 'block', borderRadius: '12px'}}
            />
            <p id="lightboxDesc" style={{color: '#fff', padding: '12px 20px', fontSize: '0.9rem', textAlign: 'center'}}>
              {lightboxDesc}
            </p>
          </div>
        </div>
      )}

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

export default Gallery;
