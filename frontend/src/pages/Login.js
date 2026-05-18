import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import '../../css/style.css';

const Login = () => {
  const [formData, setFormData] = useState({
    iin: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [user, setUser] = useState(null);
  const [school, setSchool] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already logged in
    if (api.isLoggedIn()) {
      const currentUser = api.getUser();
      if (!api.getHostTenantSlug() && currentUser?.role !== 'super_admin') {
        api.removeToken();
        api.removeUser();
        return;
      }
      if (currentUser?.role === 'super_admin') navigate('/super-admin/dashboard');
      else if (currentUser?.role === 'admin' || currentUser?.role === 'admin_teacher') navigate('/admin/dashboard');
      else if (currentUser?.role === 'teacher') navigate('/teacher-dashboard');
      else if (currentUser?.role === 'student') navigate('/student-dashboard');
      else if (currentUser?.role === 'parent') navigate('/parent-dashboard');
      else if (currentUser?.role === 'librarian') navigate('/librarian-dashboard');
      else if (currentUser?.role === 'director') navigate('/director-dashboard');
      else navigate('/staff-dashboard');
    }
    api.schoolContext().then((res) => {
      if (res.success && res.data) setSchool(res.data);
    });
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.iin.trim()) {
      newErrors.iin = 'ЖСН міндетті';
    } else if (!/^\d+$/.test(formData.iin)) {
      newErrors.iin = 'ЖСН тек сандардан тұруы керек';
    }

    if (!formData.password) {
      newErrors.password = 'Құпия сөз міндетті';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const res = await api.auth.login(formData.iin, formData.password);

      if (!res.success) {
        setErrors({ general: res.message || 'ЖСН немесе құпия сөз қате' });
        return;
      }

      // Clear any old impersonation state and save new session
      api.clearOriginalSession();
      api.setToken(res.token);
      api.setUser(res.user);
      
      setUser(res.user);
      setShowRoleModal(true);
    } catch (error) {
      setErrors({ general: 'Желі қатесі. Қайтадан көріңіз.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleModalContinue = () => {
    const roleConfig = {
      admin: { redirect: '/admin/dashboard' },
      super_admin: { redirect: '/super-admin/dashboard' },
      admin_teacher: { redirect: '/admin/dashboard' },
      teacher: { redirect: '/teacher-dashboard' },
      student: { redirect: '/student-dashboard' },
      parent: { redirect: '/parent-dashboard' },
      librarian: { redirect: '/librarian-dashboard' },
      director: { redirect: '/director-dashboard' }
    };
    const cfg = roleConfig[user.role] || { redirect: '/staff-dashboard' };
    navigate(cfg.redirect);
  };

  const getRoleConfig = (role) => {
    const configs = {
      admin: {
        icon: 'fas fa-shield-alt',
        iconColor: '#f59e0b',
        label: 'Администратор',
        color: '#f59e0b',
        desc: 'Сізде жүйенің барлық мүмкіндіктеріне толық қол жетімділік бар.'
      },
      super_admin: {
        icon: 'fas fa-globe',
        iconColor: '#38bdf8',
        label: 'Global Super Admin',
        color: '#38bdf8',
        desc: 'Сіз жаһандық басқару панеліне кіресіз.'
      },
      teacher: {
        icon: 'fas fa-chalkboard-teacher',
        iconColor: '#3b82f6',
        label: 'Мұғалім',
        color: '#3b82f6',
        desc: 'Сіз мұғалім ретінде кірдіңіз. Тапсырмалар, оқушылар мен есептерге қол жетімділік бар.'
      },
      student: {
        icon: 'fas fa-user-graduate',
        iconColor: '#22c55e',
        label: 'Оқушы',
        color: '#22c55e',
        desc: 'Сіз оқушы ретінде кірдіңіз.'
      },
      parent: {
        icon: 'fas fa-user-friends',
        iconColor: '#14b8a6',
        label: 'Ата-ана',
        color: '#14b8a6',
        desc: 'Сіз ата-ана кабинеті арқылы кірдіңіз.'
      },
      librarian: {
        icon: 'fas fa-book-reader',
        iconColor: '#8b5cf6',
        label: 'Кітапханашы',
        color: '#8b5cf6',
        desc: 'Сіз кітапхана модуліне кіру құқығымен кірдіңіз.'
      },
      director: {
        icon: 'fas fa-user-tie',
        iconColor: '#f97316',
        label: 'Директор',
        color: '#f97316',
        desc: 'Сіз директор кабинеті арқылы кірдіңіз.'
      }
    };
    return configs[role] || {
      icon: 'fas fa-user',
      iconColor: '#94a3b8',
      label: role,
      color: '#94a3b8',
      desc: ''
    };
  };

  const roleConfig = user ? getRoleConfig(user.role) : {};
  const schoolName = school?.name || 'Мектеп платформасы';

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">
            <i className="fas fa-graduation-cap"></i>
          </div>
          <h1>{schoolName}</h1>
          <p>Жүйеге кіру үшін деректеріңізді енгізіңіз</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">ЖСН (ИИН)</label>
            <div className="input-group">
              <i className="fas fa-id-card input-icon"></i>
              <input
                type="text"
                name="iin"
                className="form-control"
                placeholder="123456789012"
                maxLength="12"
                inputMode="numeric"
                autoComplete="username"
                value={formData.iin}
                onChange={handleInputChange}
                required
              />
            </div>
            {errors.iin && <div className="login-error" style={{display: 'block'}}>{errors.iin}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Құпия сөз</label>
            <div className="input-group">
              <i className="fas fa-lock input-icon"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-control"
                placeholder="••••••••"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
              <i
                className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-password`}
                onClick={() => setShowPassword(!showPassword)}
                style={{cursor: 'pointer'}}
              />
            </div>
            {errors.password && <div className="login-error" style={{display: 'block'}}>{errors.password}</div>}
          </div>

          {errors.general && (
            <div className="login-error" style={{display: 'block', textAlign: 'center', marginBottom: '12px'}}>
              {errors.general}
            </div>
          )}

          <button type="submit" className="btn btn-primary login-btn" disabled={isLoading}>
            <i className="fas fa-sign-in-alt"></i>
            <span>{isLoading ? 'Тексерілуде...' : 'Кіру'}</span>
          </button>
        </form>

        <div className="login-back">
          <Link to="/"><i className="fas fa-arrow-left"></i> Басты бетке оралу</Link>
        </div>
      </div>

      {/* Role Modal */}
      {showRoleModal && (
        <div className="modal-overlay open" id="roleModal">
          <div className="modal" style={{maxWidth: '420px'}}>
            <div className="modal-body" style={{padding: '40px', textAlign: 'center'}}>
              <div id="roleIcon" style={{fontSize: '4rem', marginBottom: '20px', color: roleConfig.iconColor}}>
                <i className={roleConfig.icon}></i>
              </div>
              <h2 id="welcomeMsg" style={{color: 'var(--white)', marginBottom: '8px'}}>
                Қош келдіңіз, {user?.full_name?.split(' ')[0] || 'Пайдаланушы'}!
              </h2>
              <p style={{color: 'var(--text-muted)', marginBottom: '8px'}}>Сіздің рөліңіз:</p>
              <div id="roleBadge" style={{marginBottom: '24px'}}>
                <span
                  className="badge"
                  style={{
                    background: `${roleConfig.color}22`,
                    color: roleConfig.color,
                    fontSize: '1rem',
                    padding: '8px 20px'
                  }}
                >
                  <i className="fas fa-circle" style={{fontSize: '0.5rem', marginRight: '6px'}}></i>
                  {roleConfig.label}
                </span>
              </div>
              <p id="roleDesc" style={{color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '28px'}}>
                {roleConfig.desc}
              </p>
              <button
                id="roleModalContinue"
                className="btn btn-primary"
                style={{width: '100%', justifyContent: 'center'}}
                onClick={handleRoleModalContinue}
              >
                Жалғастыру <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="toastContainer" className="toast-container"></div>
    </div>
  );
};

export default Login;
