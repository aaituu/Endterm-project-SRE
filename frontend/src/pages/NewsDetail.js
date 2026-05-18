import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.js';
import api, { getImageUrl, formatDate } from '../utils/api.js';
import '../../css/style.css';

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' });
};

const NewsDetail = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();

  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) {
      navigate('/news');
      return;
    }
    setLoading(true);
    try {
      const res = await api.news.get(id);
      if (res.success) {
        setNews(res.data);
      } else {
        navigate('/news');
      }
    } catch (e) {
      console.error(e);
      navigate('/news');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div>
        <Navbar activePage="news" />
        <div style={{ paddingTop: '150px', textAlign: 'center', minHeight: '60vh' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
          <p>Жүктелуде...</p>
        </div>
      </div>
    );
  }

  if (!news) return null;

  const currentUrl = window.location.href;

  return (
    <div>
      <Navbar activePage="news" />

      <div style={{ padding: '120px 0 60px' }} className="container">
        <div className="breadcrumb" style={{ marginBottom: '20px' }}>
          <Link to="/">Басты бет</Link>
          <span className="sep"><i className="fas fa-chevron-right" style={{ fontSize: '0.6rem' }}></i></span>
          <Link to="/news">Жаңалықтар</Link>
          <span className="sep"><i className="fas fa-chevron-right" style={{ fontSize: '0.6rem' }}></i></span>
          <span style={{ color: 'var(--text)' }}>{news.title}</span>
        </div>

        {news.image_url && (
           <img src={getImageUrl(news.image_url)} alt="news main" className="news-detail-main-img" />
        )}

        <div className="news-detail-header">
          {news.recommended && <span className="news-hero-tag" style={{ background: '#f59e0b', color: 'black', marginRight: '10px' }}>★ Рекомендуемая</span>}
          {news.event_type && <span className="news-hero-tag">{news.event_type}</span>}
          <div className="news-hero-meta" style={{ marginTop: '10px', color: 'var(--text-muted)' }}>
            <span><i className="far fa-calendar-alt"></i> {formatDate(news.date)} ж. {formatTime(news.date)}</span>
            <span><i className="fas fa-eye"></i> {news.views || 0} просмотров</span>
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginTop: '20px', marginBottom: '20px', color: 'var(--text)' }}>
            {news.title}
          </h1>
        </div>

        <div className="news-detail-content">
          <p style={{ whiteSpace: 'pre-line' }}>{news.description}</p>
        </div>

        <div className="news-detail-event-box">
           <p>📝 <strong>Іс-шара атауы:</strong> {news.title}</p>
           <p>📄 <strong>Сипаттама:</strong></p>
           <p style={{ marginTop: '10px', whiteSpace: 'pre-line' }}>{news.description}</p>
           <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
           <p>📅 <strong>Күні:</strong> {formatDate(news.date)} жыл</p>
           <p>⏰ <strong>Уақыты:</strong> {formatTime(news.date)}</p>
           <p>📍 <strong>Өткен орны:</strong> Мектеп / Мультимедия</p>
           <p>👤 <strong>Ұйымдастырушы:</strong> Мектеп ұжымы</p>
        </div>

        <div style={{ marginTop: '50px', padding: '30px', background: 'var(--bg-2)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
              ӨЖ
            </div>
          </div>
          <div>
            <h4 style={{ margin: 0, color: 'var(--text)' }}>МЕКТЕП ҰЖЫМЫ</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Автор</p>
          </div>
        </div>

        <div style={{ marginTop: '40px', borderTop: '1px solid var(--border)', paddingTop: '30px', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Поделиться:</h3>
          <div className="share-buttons">
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`} target="_blank" rel="noreferrer" className="share-btn share-fb"><i className="fab fa-facebook-f"></i> Facebook</a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(news.title)}`} target="_blank" rel="noreferrer" className="share-btn share-tw"><i className="fab fa-twitter"></i> Twitter</a>
            <a href={`https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(news.title)}`} target="_blank" rel="noreferrer" className="share-btn share-tg"><i className="fab fa-telegram-plane"></i> Telegram</a>
            <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(news.title + ' ' + currentUrl)}`} target="_blank" rel="noreferrer" className="share-btn share-wa"><i className="fab fa-whatsapp"></i> WhatsApp</a>
            <Link to="/news" className="btn btn-primary" style={{ marginLeft: 'auto' }}><i className="fas fa-arrow-left"></i> Все новости</Link>
          </div>
        </div>

        {/* Similar News */}
        {news.related && news.related.length > 0 && (
          <div style={{ marginTop: '60px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '30px', color: 'var(--text)' }}>Похожие новости</h2>
            <div className="news-grid">
              {news.related.map(item => (
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
                    <div className="news-meta">
                      <span className="news-date"><i className="far fa-calendar-alt"></i> {formatDate(item.date)}</span>
                      <Link to={`/news-detail?id=${item.id}`} className="news-read-more" style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'none' }}>Толығырақ <i className="fas fa-arrow-right"></i></Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default NewsDetail;
