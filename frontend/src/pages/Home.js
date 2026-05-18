import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { getImageUrl } from '../utils/api.js';
import Navbar from '../components/Navbar.js';
import '../../css/style.css';

const Home = () => {
  const [stats, setStats] = useState({ teachers: 0, students: 0, experience: 0, founded: 0 });
  const [latestNews, setLatestNews] = useState([]);
  const [adminPreview, setAdminPreview] = useState([]);
  const [slides, setSlides] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [school, setSchool] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroTimerRef = useRef(null);
  const statsObserverRef = useRef(null);
  const fadeObserverRef = useRef(null);

  // Generate particles
  useEffect(() => {
    const pContainer = document.getElementById('particles');
    if (pContainer) {
      for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (8 + Math.random() * 12) + 's';
        p.style.animationDelay = (Math.random() * 10) + 's';
        p.style.width = p.style.height = (3 + Math.random() * 4) + 'px';
        pContainer.appendChild(p);
      }
    }
  }, []);

  // Load all data
  useEffect(() => {
    const loadAll = async () => {
      const [contextRes, statsRes, newsRes, adminRes, slidesRes, historyRes, programsRes] = await Promise.all([
        api.schoolContext(),
        api.stats.public(),
        api.news.latest(3),
        api.admin.list(),
        api.slides.list(),
        api.siteContent.list('history'),
        api.siteContent.list('programs'),
      ]);

      if (contextRes.success) setSchool(contextRes.data || null);
      if (statsRes.success && statsRes.data) {
        setStats({
          teachers: statsRes.data.teachers_count?.value || 45,
          students: statsRes.data.students_count?.value || 620,
          experience: statsRes.data.experience_years?.value || 35,
          founded: statsRes.data.founded_year?.value || 1989
        });
      }
      if (newsRes.success) setLatestNews(newsRes.data || []);
      if (adminRes.success) setAdminPreview((adminRes.data || []).slice(0, 4));
      if (slidesRes.success) setSlides(slidesRes.data || []);
      if (historyRes.success) setHistoryItems(historyRes.data || []);
      if (programsRes.success) setPrograms(programsRes.data || []);
    };
    loadAll();
  }, []);

  // Hero carousel auto-play
  useEffect(() => {
    const total = slides.length || 3;
    const startTimer = () => {
      heroTimerRef.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % total);
      }, 5000);
    };
    startTimer();
    return () => clearInterval(heroTimerRef.current);
  }, [slides]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    clearInterval(heroTimerRef.current);
    const total = slides.length || 3;
    heroTimerRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % total);
    }, 5000);
  };

  // Animate counters
  useEffect(() => {
    const animateCounters = () => {
      const counters = document.querySelectorAll('.stat-number[data-target]');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-target'));
          const duration = 1800;
          const step = target / (duration / 16);
          let current = 0;
          const update = () => {
            current = Math.min(current + step, target);
            el.textContent = Math.floor(current).toLocaleString();
            if (current < target) requestAnimationFrame(update);
          };
          requestAnimationFrame(update);
          observer.unobserve(el);
        });
      }, { threshold: 0.5 });
      counters.forEach(c => observer.observe(c));
      statsObserverRef.current = observer;
    };
    animateCounters();
    return () => statsObserverRef.current?.disconnect();
  }, [stats]);

  // Intersection observer animations
  useEffect(() => {
    const animItems = document.querySelectorAll('.stat-card,.program-card,.timeline-card,.news-card,.admin-card');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    animItems.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });
    fadeObserverRef.current = observer;
    return () => observer.disconnect();
  }, [latestNews, adminPreview]);

  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('kk-KZ');
  const schoolName = school?.name || 'Мектеп';

  // Default slides if none in DB
  const defaultSlides = [
    { id: 'default-0', title_kz: schoolName, quote: 'Білім – болашақтың кілті.', btn1: { label: 'Мектеп туралы', anchor: 'about' }, btn2: { label: 'Жаңалықтар', href: '/news' } },
    { id: 'default-1', title_kz: 'Өз мүмкіндігіңді ашу – сенің міндетің', quote: '"Оқу – өрге жүзу, оқымау – көрге кіру." — Халық мақалы', btn1: { label: 'Мұғалімдер', href: '/teachers' }, btn2: { label: 'Галерея', href: '/gallery' } },
    { id: 'default-2', title_kz: 'Ертеңгі күн – бүгінгі білімде', quote: '"Жас ұрпақ – елдің болашағы." — Ел мақалы', btn1: { label: 'Байланыс', href: '/contact' }, btn2: { label: 'Бағдарлама', anchor: 'programs' } },
  ];
  const displaySlides = slides.length > 0 ? slides : defaultSlides;
  const totalSlides = displaySlides.length;
  const fallbackHeroImage = latestNews.find((n) => n.image_url)?.image_url || null;

  // Default programs if none in DB
  const defaultPrograms = [
    { id: 'p1', content_key: 'primary', title: 'Бастауыш сынып', body: '1-4 сыныптар. Жеке тұлғаның негізін қалыптастыру, негізгі дағдыларды дамыту.', tag: '1–4 сынып', icon: 'fa-seedling' },
    { id: 'p2', content_key: 'middle', title: 'Негізгі мектеп', body: '5-9 сыныптар. Пәндік білімді тереңдету, ғылыми ойлауды дамыту.', tag: '5–9 сынып', icon: 'fa-book', featured: true },
    { id: 'p3', content_key: 'high', title: 'Жоғары мектеп', body: '10-11 сыныптар. ҰБТ-ға дайындық, профильдік білім беру.', tag: '10–11 сынып', icon: 'fa-flask' },
  ];
  const displayPrograms = programs.length > 0 ? programs.map((p, i) => ({
    ...p,
    tag: p.content_key === 'primary' ? '1–4 сынып' : p.content_key === 'middle' ? '5–9 сынып' : '10–11 сынып',
    icon: p.content_key === 'primary' ? 'fa-seedling' : p.content_key === 'middle' ? 'fa-book' : 'fa-flask',
    featured: p.content_key === 'middle'
  })) : defaultPrograms;

  // Default history if none in DB
  const defaultHistory = [
    { id: 'h1', content_key: 'start', title: 'Мектеп туралы', body: `${schoolName} ресми мектеп парақшасы.` },
    { id: 'h2', content_key: '2000', title: 'Жаңа ғимарат', body: 'Заманауи жабдықталған жаңа оқу ғимараты ашылды.' },
    { id: 'h3', content_key: '2010', title: 'Цифрлық білім', body: 'Интерактивті тақталар мен компьютерлік сыныптар енгізілді.' },
    { id: 'h4', content_key: '2020', title: 'Жаңартылған бағдарлама', body: 'Жаңартылған білім беру бағдарламасына (жаңа формат) толық көшу.' },
    { id: 'h5', content_key: '2024', title: 'Цифрлық мектеп', body: 'Толыққанды цифрлық басқару жүйесі іске қосылды.' },
  ];
  const displayHistory = historyItems.length > 0 ? historyItems : defaultHistory;

  const newsCard = (n) => (
    <article key={n.id} className="news-card">
      <div className="news-card-img">
        {n.image_url ? (
          <img src={getImageUrl(n.image_url)} alt={n.title} loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="placeholder-icon"><i className="fas fa-newspaper"></i></div>
        )}
      </div>
      <div className="news-card-body">
        {n.event_type && <span className="news-event-tag">{n.event_type}</span>}
        <h3>{n.title}</h3>
        <p>{n.description?.substring(0, 140)}{n.description?.length > 140 ? '...' : ''}</p>
        <div className="news-meta">
          <span className="news-date"><i className="far fa-calendar-alt"></i> {formatDate(n.date)}</span>
          <Link to={`/news-detail?id=${n.id}`} className="news-read-more">Толығырақ <i className="fas fa-arrow-right"></i></Link>
        </div>
      </div>
    </article>
  );

  return (
    <div>
      <Navbar activePage="home" />

      {/* Hero Carousel */}
      <section className="hero" id="home">
        <div className="animated-bg">
          <div className="float-shape shape-1"></div>
          <div className="float-shape shape-2"></div>
          <div className="float-shape shape-3"></div>
          <div className="float-shape shape-4"></div>
          <div className="float-shape shape-5"></div>
          <div className="particles" id="particles"></div>
        </div>

        <div className="hero-carousel" id="heroCarousel">
          {displaySlides.map((slide, i) => (
            <div key={slide.id || i} className={`hero-slide ${currentSlide === i ? 'active' : ''}`}
              style={(slide.image_url || fallbackHeroImage) ? {
                backgroundImage: `url(${getImageUrl(slide.image_url || fallbackHeroImage)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : {}}>
              {(slide.image_url || fallbackHeroImage) && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)' }}></div>
              )}
              <div className="hero-content" style={{ position: 'relative', zIndex: 2 }}>
                <span className="hero-badge">Білім ордасы</span>
                <h1>{slide.title_kz}</h1>
                {slide.quote && <p className="hero-quote">{slide.quote}</p>}
                <div className="hero-btns">
                  {slide.btn1?.anchor ? (
                    <a href={`#${slide.btn1.anchor}`} onClick={(e) => handleSmoothScroll(e, slide.btn1.anchor)} className="btn btn-white">{slide.btn1.label}</a>
                  ) : (
                    <a href={slide.btn1?.href || '#about'} onClick={(e) => handleSmoothScroll(e, 'about')} className="btn btn-white">
                      {slide.btn1?.label || 'Мектеп туралы'}
                    </a>
                  )}
                  {slide.btn2?.href ? (
                    <Link to={slide.btn2.href} className="btn btn-outline-white">{slide.btn2.label}</Link>
                  ) : (
                    <Link to="/news" className="btn btn-outline-white">Жаңалықтар</Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="carousel-controls">
          <button className="carousel-btn prev" onClick={() => goToSlide((currentSlide - 1 + totalSlides) % totalSlides)}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <div className="carousel-dots">
            {displaySlides.map((_, i) => (
              <span key={i} className={`dot ${currentSlide === i ? 'active' : ''}`} onClick={() => goToSlide(i)}></span>
            ))}
          </div>
          <button className="carousel-btn next" onClick={() => goToSlide((currentSlide + 1) % totalSlides)}>
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
        <div className="hero-scroll"><a href="#stats" onClick={(e) => handleSmoothScroll(e, 'stats')}><i className="fas fa-chevron-down"></i></a></div>
        <svg className="hero-wave" viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#f8faff" />
        </svg>
      </section>

      {/* Stats */}
      <section className="stats-section" id="stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-chalkboard-teacher"></i></div>
              <div className="stat-number" data-target={stats.teachers}>0</div>
              <div className="stat-label">Мұғалімдер саны</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-user-graduate"></i></div>
              <div className="stat-number" data-target={stats.students}>0</div>
              <div className="stat-label">Оқушылар саны</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-award"></i></div>
              <div className="stat-number" data-target={stats.experience}>0</div>
              <div className="stat-label">Тәжірибе жылдары</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-calendar-alt"></i></div>
              <div className="stat-number" data-target={stats.founded}>0</div>
              <div className="stat-label">Тіркелген жыл</div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="about-section" id="about">
        <div className="container">
          <div className="about-grid">
            <div className="about-text">
              <div className="section-label"><i className="fas fa-info-circle"></i> Біз туралы</div>
              <h2 className="section-title">{schoolName}</h2>
              <p className="about-desc">
                {schoolName} – оқушы, мұғалім және ата-ана үшін цифрлық мектеп ортасын ұсынатын білім беру ұйымы.
                Мектеп жаңалықтары, әкімшілік құрамы, оқу үдерісі және есептер осы жеке парақшада жүргізіледі.
              </p>
              <div className="about-features">
                <div className="feature-item"><div className="feature-icon"><i className="fas fa-check-circle"></i></div><span>Сапалы білім беру</span></div>
                <div className="feature-item"><div className="feature-icon"><i className="fas fa-check-circle"></i></div><span>Жеке тұлғаны дамыту</span></div>
                <div className="feature-item"><div className="feature-icon"><i className="fas fa-check-circle"></i></div><span>Заманауи технологиялар</span></div>
              </div>
              <div className="school-info-grid">
                <div className="info-item"><i className="fas fa-city"></i><div><span className="info-label">Қала</span><span className="info-val">Шымкент</span></div></div>
                <div className="info-item"><i className="fas fa-map-marker-alt"></i><div><span className="info-label">Аудан</span><span className="info-val">Абай ауданы</span></div></div>
                <div className="info-item"><i className="fas fa-road"></i><div><span className="info-label">Мекен-жай</span><span className="info-val">Жәнібеков к-сі, 12</span></div></div>
              </div>
            </div>
            <div className="about-visual">
              <div className="about-visual-card card-1"><i className="fas fa-trophy"></i><span>Үздік мектеп 2023</span></div>
              <div className="about-visual-card card-2"><i className="fas fa-star"></i><span>500+ Жетістік</span></div>
              <div className="about-visual-main">
                <i className="fas fa-school"></i>
                <h3>{schoolName}</h3>
                <p>1989 жылдан бері</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Administration Preview */}
      <section className="admin-preview-section" id="administration">
        <div className="animated-bg" style={{ opacity: 0.4 }}>
          <div className="float-shape shape-3" style={{ opacity: 0.04 }}></div>
          <div className="float-shape shape-4" style={{ opacity: 0.04 }}></div>
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-header">
            <div className="section-label"><i className="fas fa-users-tie"></i> Басшылық</div>
            <h2 className="section-title">Мектеп әкімшілігі</h2>
            <p className="section-desc">Мектебіміздің тәжірибелі басшылар тобы</p>
          </div>
          <div className="admin-cards">
            {adminPreview.length > 0 ? adminPreview.map(a => (
              <Link key={a.id} to="/administration" className="admin-card">
                <div className="admin-avatar">
                  {a.photo_url ? (
                    <img src={getImageUrl(a.photo_url)} alt={a.full_name} onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <i className="fas fa-user-tie"></i>
                  )}
                </div>
                <h3>{a.full_name}</h3>
                <p>{a.position}</p>
              </Link>
            )) : (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <i className="fas fa-users-tie"></i>
                <h3>Әкімшілік туралы ақпарат әлі қосылмаған</h3>
              </div>
            )}
          </div>
          <div className="text-center mt-40">
            <Link to="/administration" className="btn btn-primary">Барлық әкімшілікті көру <i className="fas fa-arrow-right"></i></Link>
          </div>
        </div>
      </section>

      {/* Programs - from DB */}
      <section className="programs-section" id="programs">
        <div className="container">
          <div className="section-header">
            <div className="section-label"><i className="fas fa-book-open"></i> Оқу</div>
            <h2 className="section-title">Оқу бағдарламасы</h2>
            <p className="section-desc">Мектебімізде қолданылатын заманауи оқыту жүйесі</p>
          </div>
          <div className="programs-grid">
            {displayPrograms.map((p) => (
              <div key={p.id} className={`program-card ${p.featured ? 'featured' : ''}`}>
                {p.featured && <div className="program-badge">Негізгі</div>}
                <div className="program-icon"><i className={`fas ${p.icon || 'fa-book'}`}></i></div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
                <div className="program-tag">{p.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* History - from DB */}
      <section className="history-section" id="history">
        <div className="container">
          <div className="section-header">
            <div className="section-label"><i className="fas fa-landmark"></i> Тарих</div>
            <h2 className="section-title">Мектеп тарихы</h2>
          </div>
          <div className="timeline">
            {displayHistory.map((item, i) => (
              <div key={item.id} className={`timeline-item ${i % 2 === 0 ? 'left' : 'right'}`}>
                <div className="timeline-dot"></div>
                <div className="timeline-card">
                  <span className="timeline-year">{item.content_key}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="news-section" id="news">
        <div className="container">
          <div className="section-header">
            <div className="section-label"><i className="fas fa-newspaper"></i> Жаңалықтар</div>
            <h2 className="section-title">Соңғы жаңалықтар</h2>
            <p className="section-desc">Мектеп өміріндегі соңғы оқиғалар</p>
          </div>
          <div className="news-grid">
            {latestNews.length > 0 ? latestNews.map(newsCard) : (
              <div className="loading-spinner"><i className="fas fa-spinner fa-spin"></i></div>
            )}
          </div>
          <div className="text-center mt-40">
            <Link to="/news" className="btn btn-primary">Барлық жаңалықтар <i className="fas fa-arrow-right"></i></Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo"><i className="fas fa-graduation-cap"></i><span>{schoolName}</span></div>
              <p>Білім – болашақтың кілті. Біз әрбір баланың жеке қабілетін дамытамыз.</p>
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
                <li><a href="#about" onClick={(e) => handleSmoothScroll(e, 'about')}>Мектеп туралы</a></li>
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
                <li><i className="fas fa-clock"></i> Дс–Жм: 08:00–18:00</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 {schoolName}. Барлық құқықтар қорғалған.</p>
          </div>
        </div>
      </footer>

      <div id="toastContainer" className="toast-container"></div>
    </div>
  );
};

export default Home;
