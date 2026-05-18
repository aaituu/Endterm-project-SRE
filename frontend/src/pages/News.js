import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { getImageUrl, formatDate } from '../utils/api.js';
import Navbar from '../components/Navbar.js';
import '../../css/style.css';

const News = () => {
  const [news, setNews] = useState([]);
  const [filteredNews, setFilteredNews] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [latestNews, setLatestNews] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const PAGE_SIZE = 9;

  useEffect(() => {
    loadNews();
    loadLatestNews();
  }, []);

  const loadLatestNews = async () => {
    const res = await api.news.latest(3);
    if (res.success && res.data) setLatestNews(res.data);
  };

  useEffect(() => {
    if (latestNews.length === 0) return;
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % latestNews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [latestNews]);

  useEffect(() => {
    filterNews();
  }, [news, searchTerm, typeFilter]);

  const loadNews = async () => {
    try {
      setLoading(true);
      // Try fetching all approved news
      const res = await api.news.list('limit=100');
      if (res.success && res.data) {
        setNews(res.data);
      } else {
        console.error('News load error:', res.message);
      }
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterNews = () => {
    let filtered = news.filter(item => {
      const matchesSearch = !searchTerm ||
        (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !typeFilter || ((item.event_type || '').toLowerCase() === typeFilter.toLowerCase());
      return matchesSearch && matchesType;
    });
    setFilteredNews(filtered);
    setCurrentPage(1);
  };

  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredNews.slice(startIndex, startIndex + PAGE_SIZE);
  };

  const getTotalPages = () => Math.ceil(filteredNews.length / PAGE_SIZE);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    const totalPages = getTotalPages();
    if (totalPages <= 1) return null;
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button key={i} className={`page-btn ${i === currentPage ? 'active' : ''}`} onClick={() => handlePageChange(i)}>{i}</button>
      );
    }
    return (
      <div className="pagination">
        {currentPage > 1 && <button className="page-btn wide" onClick={() => handlePageChange(currentPage - 1)}><i className="fas fa-chevron-left"></i></button>}
        {pages}
        {currentPage < totalPages && <button className="page-btn wide" onClick={() => handlePageChange(currentPage + 1)}><i className="fas fa-chevron-right"></i></button>}
      </div>
    );
  };

  return (
    <div>
      <Navbar activePage="news" />

      {/* Page Hero */}
      <section className="page-hero">
        <div className="animated-bg">
          <div className="float-shape shape-1"></div>
          <div className="float-shape shape-2"></div>
          <div className="float-shape shape-3"></div>
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="breadcrumb">
            <Link to="/">Басты бет</Link>
            <span className="sep"><i className="fas fa-chevron-right" style={{ fontSize: '0.6rem' }}></i></span>
            <span>Жаңалықтар</span>
          </div>
          <h1>Жаңалықтар</h1>
          <p>Мектеп өміріндегі соңғы оқиғалар мен хабарлар</p>
        </div>
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, zIndex: 1 }}>
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="#f8faff" />
        </svg>
      </section>

      <section className="inner-content">
        <div className="container">
          {/* Latest News Slider */}
          {latestNews.length > 0 && (
            <div className="news-hero-slider">
              {latestNews.map((slide, index) => (
                <div key={slide.id} className={`news-hero-slide ${index === activeSlide ? 'active' : ''}`}>
                  <img src={getImageUrl(slide.image_url)} alt="news" />
                  <div className="news-hero-overlay">
                    {slide.event_type && <span className="news-hero-tag">{slide.event_type}</span>}
                    <h2 className="news-hero-title">{slide.title}</h2>
                    <div className="news-hero-desc">{slide.description}</div>
                    <div className="news-hero-meta">
                      <span><i className="far fa-calendar-alt"></i> {formatDate(slide.date)}</span>
                      <span><i className="fas fa-eye"></i> {slide.views || 0} қаралым</span>
                    </div>
                    <Link to={`/news-detail?id=${slide.id}`} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Толығырақ оқу</Link>
                  </div>
                </div>
              ))}
              {/* Optional: Slider Navigation Dots */}
              <div style={{ position: 'absolute', bottom: '20px', right: '40px', display: 'flex', gap: '8px', zIndex: 10 }}>
                {latestNews.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveSlide(i)}
                    style={{ width: '10px', height: '10px', borderRadius: '50%', background: i === activeSlide ? 'var(--primary)' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer' }}
                  ></button>
                ))}
              </div>
            </div>
          )}

          <div className="filter-bar">
            <input
              type="text"
              className="form-control"
              id="searchInput"
              placeholder="Жаңалық іздеу..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="form-select"
              id="typeFilter"
              style={{ maxWidth: '200px' }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Барлық түрлер</option>
              <option value="ғылым">Ғылым</option>
              <option value="олимпиада">Олимпиада</option>
              <option value="мереке">Мереке</option>
              <option value="жалпы">Жалпы</option>
            </select>
          </div>
          <div className="news-grid" id="newsGrid">
            {loading ? (
              <div className="loading-spinner" style={{ gridColumn: '1/-1' }}>
                <i className="fas fa-spinner fa-spin"></i>
              </div>
            ) : getCurrentPageItems().length > 0 ? (
              getCurrentPageItems().map(item => (
                <article key={item.id} className="news-card">
                  <div className="news-card-img">
                    {item.image_url ? (
                      <img src={getImageUrl(item.image_url)} alt={item.title} loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="placeholder-icon"><i className="fas fa-newspaper"></i></div>
                    )}
                  </div>
                  <div className="news-card-body">
                    {item.event_type && <span className="news-event-tag">{item.event_type}</span>}
                    <h3>{item.title}</h3>
                    <p>{item.description ? item.description.substring(0, 150) : ''}</p>
                    <div className="news-meta">
                      <span className="news-date"><i className="far fa-calendar-alt"></i> {formatDate(item.date)}</span>
                      <Link to={`/news-detail?id=${item.id}`} className="news-read-more" style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'none' }}>Толығырақ <i className="fas fa-arrow-right"></i></Link>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <i className="fas fa-search"></i>
                <h3>Жаңалық табылмады</h3>
              </div>
            )}
          </div>
          {renderPagination()}
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
                <li><i className="fas fa-map-marker-alt"></i> Шымкент, Абай ауданы, Жәнібеков к-сі, 12</li>
                <li><i className="fas fa-phone"></i> +7 (7252) 00-00-00</li>
                <li><i className="fas fa-envelope"></i> school@janibek.edu.kz</li>
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

export default News;
