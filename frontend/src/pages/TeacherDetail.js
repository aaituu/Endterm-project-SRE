import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.js';
import api, { getImageUrl, formatDate } from '../utils/api.js';
import '../../css/style.css';

const TeacherDetail = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) {
      navigate('/teachers');
      return;
    }
    setLoading(true);
    try {
      const res = await api.teachers.get(id);
      if (res.success) {
        setTeacher(res.data);
      } else {
        navigate('/teachers');
      }
    } catch (e) {
      console.error(e);
      navigate('/teachers');
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
        <Navbar activePage="teachers" />
        <div style={{ paddingTop: '150px', textAlign: 'center', minHeight: '60vh' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
          <p>Жүктелуде...</p>
        </div>
      </div>
    );
  }

  if (!teacher) return null;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Navbar activePage="teachers" />

      {/* Header section spans full width visually, but we constrain content */}
      <div style={{ background: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)', paddingTop: '120px', paddingBottom: '60px' }}>
        <div className="container">
          <div className="breadcrumb" style={{ marginBottom: '20px', color: 'rgba(255,255,255,0.7)' }}>
            <Link to="/" style={{ color: 'white' }}>Басты бет</Link>
            <span className="sep"><i className="fas fa-chevron-right" style={{ fontSize: '0.6rem' }}></i></span>
            <Link to="/teachers" style={{ color: 'white' }}>Мұғалімдер</Link>
            <span className="sep"><i className="fas fa-chevron-right" style={{ fontSize: '0.6rem' }}></i></span>
            <span style={{ color: 'white' }}>{teacher.full_name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '40px', color: 'white', flexWrap: 'wrap' }}>
            <div className="td-avatar-wrap">
              <img src={teacher.photo_url ? getImageUrl(teacher.photo_url) : '/assets/images/default-avatar.png'} alt={teacher.full_name} className="td-avatar" />
              <div className="td-badge"><i className="fas fa-star"></i></div>
            </div>
            
            <div className="td-info">
              <h1>{teacher.full_name}</h1>
              <div className="td-tags">
                <span className="td-tag highlight"><i className="fas fa-award"></i> {teacher.category || 'Мұғалім'}</span>
                <span className="td-tag"><i className="fas fa-book"></i> {teacher.subject} пәні мұғалімі</span>
              </div>
              <div className="td-stats">
                <div className="td-stat-box">
                  <span>🏆 Жетістіктер</span>
                  <strong>{teacher.achievements_count || 0}</strong>
                </div>
                <div className="td-stat-box">
                  <span>👥 Сыныптар</span>
                  <strong>{teacher.lessons_count || 0}</strong>
                </div>
                <div className="td-stat-box">
                  <span>📅 Іс-шаралар</span>
                  <strong>{teacher.events_count || 0}</strong>
                </div>
                <div className="td-stat-box">
                  <span>🏅 Марапаттар</span>
                  <strong>{teacher.awards_count || 0}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '60px 0' }}>
        
        {/* Жетістіктер (Certificates) */}
        <div className="td-section">
          <div className="td-section-title">
            <i className="fas fa-trophy" style={{ background: '#f59e0b' }}></i>
            Жарыста алған жүлделер мен жетістіктері
          </div>
          {(!teacher.certificates || teacher.certificates.length === 0) ? (
             <div className="td-card" style={{ alignItems: 'center', color: 'var(--text-muted)' }}>
               <div className="td-card-icon" style={{ background: 'var(--bg-2)', color: 'var(--text-muted)' }}><i className="fas fa-gift"></i></div>
               <h4>Жетістіктер әлі жоқ</h4>
               <p>Бұл мұғалім ешқандай жетістік алмаған.</p>
             </div>
          ) : (
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
               {teacher.certificates.map(cert => (
                 <div key={cert.id} className="td-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                      <div style={{ background: '#f59e0b', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                        <i className="fas fa-medal"></i>
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Грамота / Сертификат</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{cert.title}</p>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                      <i className="far fa-calendar-alt"></i> {formatDate(cert.issued_at)}
                    </div>
                    {cert.image_url && (
                      <a href={getImageUrl(cert.image_url)} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ background: '#f59e0b', color: 'white', border: 'none', alignSelf: 'flex-start' }}>
                        Сертификат көру
                      </a>
                    )}
                 </div>
               ))}
             </div>
          )}
        </div>

        {/* Оқытатын сыныптар */}
        <div className="td-section">
          <div className="td-section-title">
            <i className="fas fa-chalkboard-teacher" style={{ background: '#3b82f6' }}></i>
            Оқытатын сыныптар
          </div>
          {teacher.class_leadership ? (
            <div className="td-card blue" style={{ borderLeft: '4px solid #3b82f6', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px' }}>
              <div className="td-card-icon" style={{ margin: 0 }}>
                <i className="fas fa-users"></i>
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{teacher.class_leadership}</h3>
                <span className="td-tag highlight" style={{ display: 'inline-block', marginTop: '5px' }}><i className="fas fa-crown"></i> Класс жетекшісі</span>
              </div>
            </div>
          ) : (
            <div className="td-card" style={{ alignItems: 'center', color: 'var(--text-muted)' }}>
               <h4>Сыныптар көрсетілмеген</h4>
            </div>
          )}
        </div>

        {/* Марапаттар (Awards) */}
        <div className="td-section">
          <div className="td-section-title">
            <i className="fas fa-award" style={{ background: '#ef4444' }}></i>
            Марапаттар
          </div>
          {(!teacher.awards || teacher.awards.length === 0) ? (
             <div className="td-card" style={{ alignItems: 'center', color: 'var(--text-muted)' }}>
               <div className="td-card-icon" style={{ background: 'var(--bg-2)', color: 'var(--text-muted)' }}><i className="fas fa-gift"></i></div>
               <h4>Марапаттар әлі жоқ</h4>
               <p>Бұл мұғалім ешқандай марапат алмаған.</p>
             </div>
          ) : (
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
               {teacher.awards.map(award => (
                 <div key={award.id} className="td-card" style={{ borderLeft: '4px solid #ef4444' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                     <div style={{ background: '#fee2e2', color: '#ef4444', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                       <i className="fas fa-star"></i>
                     </div>
                     <div>
                       <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{award.title}</h4>
                       <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{award.year} жыл</p>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </div>

        {/* Ұйымдастырған іс-шаралар */}
        <div className="td-section">
          <div className="td-section-title">
            <i className="fas fa-calendar-check" style={{ background: '#22c55e' }}></i>
            Ұйымдастырған іс-шаралар
          </div>
          {(!teacher.events || teacher.events.length === 0) ? (
             <div className="td-card" style={{ alignItems: 'center', color: 'var(--text-muted)' }}>
               <div className="td-card-icon" style={{ background: 'var(--bg-2)', color: 'var(--text-muted)' }}><i className="fas fa-gift"></i></div>
               <h4>Іс-шаралар жоқ</h4>
               <p>Бұл мұғалім іс-шараларға қатыспаған.</p>
             </div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               {teacher.events.map(ev => (
                 <div key={ev.id} className="td-card green" style={{ borderLeft: '4px solid #22c55e', flexDirection: 'row', gap: '20px', padding: '20px' }}>
                   <div className="td-card-icon" style={{ margin: 0, flexShrink: 0 }}>
                     <i className="far fa-calendar-alt"></i>
                   </div>
                   <div style={{ flex: 1 }}>
                     <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}><Link to={`/news-detail?id=${ev.id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>{ev.title}</Link></h3>
                     <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                       {ev.event_type && <span style={{ marginRight: '10px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px' }}>{ev.event_type}</span>}
                       <i className="far fa-clock"></i> {formatDate(ev.date)}
                     </p>
                     <Link to={`/news-detail?id=${ev.id}`} style={{ color: '#22c55e', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none' }}>Толығырақ көру &rarr;</Link>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TeacherDetail;
