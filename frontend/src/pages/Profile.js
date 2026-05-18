import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.js';
import api from '../utils/api.js';
import '../../css/style.css';
import '../../css/admin.css';
import AdminShell from '../components/AdminShell.js';
import SuperAdminShell from '../components/SuperAdminShell.js';

const Profile = () => {
  const [user, setUser] = useState(api.getUser());
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [iin, setIin] = useState(user?.iin || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.photo_url || '');
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [telegramLink, setTelegramLink] = useState(null);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'super_admin': return '/super-admin/dashboard';
      case 'admin': return '/admin/dashboard';
      case 'teacher': return '/teacher-dashboard';
      case 'student': return '/student-dashboard';
      case 'parent': return '/parent-dashboard';
      case 'librarian': return '/librarian-dashboard';
      case 'director': return '/director-dashboard';
      default: return '/staff-dashboard';
    }
  };

  const normalizePhotoUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${window.location.origin}${url}`;
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (api.getUser()?.role === 'super_admin') {
        navigate('/super-admin/dashboard');
        return;
      }
      const result = await api.auth.me();
      if (!result.success) {
        api.removeToken();
        api.removeUser();
        navigate('/login');
        return;
      }
      const data = result.data;
      if (data.role === 'super_admin') {
        navigate('/super-admin/dashboard');
        return;
      }
      setUser(data);
      setFullName(data.full_name || '');
      setIin(data.iin || '');
      setPreviewUrl(normalizePhotoUrl(data.photo_url));
      const existing = api.getUser() || {};
      api.setUser({ ...existing, ...data });

      const tgRes = await api.telegram.status();
      if (tgRes.success) setTelegramStatus(tgRes.data);
    };
    loadProfile();
  }, [navigate]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setMessage('');
    setStatus(null);

    if (newPassword && newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('Жаңа құпия сөз бен растау сәйкес емес.');
      return;
    }

    const formData = new FormData();
    formData.append('full_name', fullName);
    formData.append('iin', iin);
    if (photoFile) formData.append('photo', photoFile);
    if (newPassword) {
      formData.append('current_password', currentPassword);
      formData.append('new_password', newPassword);
    }

    setSaving(true);
    const result = await api.auth.updateProfile(formData);
    setSaving(false);

    if (!result.success) {
      setStatus('error');
      setMessage(result.message || 'Қате пайда болды.');
      return;
    }

    setStatus('success');
    setMessage('Профиль сәтті жаңартылды.');
    const updatedUser = { ...user, ...result.data, photo_url: result.data.photo_url || user?.photo_url };
    setUser(updatedUser);
    api.setUser(updatedUser);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleTelegramConnect = async () => {
    setTelegramBusy(true);
    setMessage('');
    const result = await api.telegram.linkCode();
    setTelegramBusy(false);
    if (!result.success) {
      setStatus('error');
      setMessage(result.message || 'Telegram кодын жасау мүмкін болмады.');
      return;
    }
    setTelegramLink(result.data);
    const tgRes = await api.telegram.status();
    if (tgRes.success) setTelegramStatus(tgRes.data);
  };

  const handleTelegramUnlink = async () => {
    setTelegramBusy(true);
    setMessage('');
    const result = await api.telegram.unlink();
    setTelegramBusy(false);
    if (!result.success) {
      setStatus('error');
      setMessage(result.message || 'Telegram байланысын өшіру мүмкін болмады.');
      return;
    }
    setTelegramLink(null);
    setTelegramStatus({ linked: false, notification_enabled: true });
    setStatus('success');
    setMessage('Telegram байланысы өшірілді.');
  };

    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  if (!user) {
    return <div>Жүйеге қайта кіріңіз немесе бетті жаңартыңыз.</div>;
  }

  
  const content = (
    <>
        <div className={isAdmin ? "" : "role-header"} style={isAdmin ? { display: 'flex', justifyContent: 'space-between', marginBottom: 24 } : {}}>
          <div>
            <h1 className={isAdmin ? "ap-page-title" : ""}>Менің профилім</h1>
            <p className={isAdmin ? "ap-page-sub" : "text-muted"}>Жеке ақпаратты жаңарту және парольді өзгерту.</p>
          </div>
          <div className="profile-actions">
            {!isAdmin && <Link to={getDashboardPath()} className="btn btn-secondary" style={{ marginRight: 10 }}>Кабинетке қайту</Link>}
            <button type="submit" form="profileForm" className="btn btn-primary" disabled={saving}>
              {saving ? 'Сақталуда...' : 'Сақтау'}
            </button>
          </div>
        </div>

        <div className={isAdmin ? "ap-card profile-card" : "data-card profile-card"}>
          {message && (
            <div className={`profile-status ${status === 'success' ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <form id="profileForm" className="profile-form" onSubmit={handleSave}>
            <div className="profile-form-grid">
              <div className="profile-photo-box">
                {previewUrl ? (
                  <img className="profile-photo-preview" src={previewUrl} alt="Профиль фото" />
                ) : (
                  <div className="photo-placeholder">
                    {user.full_name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                  </div>
                )}
                <label htmlFor="photoUpload" className="btn btn-outline">
                  Фото өзгерту
                </label>
                <input id="photoUpload" type="file" accept="image/*" onChange={handlePhotoChange} hidden />
              </div>

              <div className="profile-field-group">
                <div>
                  <label htmlFor="fullName">Аты-жөні</label>
                  <input
                    id="fullName"
                    className={isAdmin ? "ap-input" : "form-control"}
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="iin">ЖСН</label>
                  <input
                    id="iin"
                    className={isAdmin ? "ap-input" : "form-control"}
                    type="text"
                    value={iin}
                    onChange={(e) => setIin(e.target.value)}
                    maxLength={12}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="currentPassword">Ағымдағы құпия сөз</label>
                  <input
                    id="currentPassword"
                    className={isAdmin ? "ap-input" : "form-control"}
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Құпия сөзді өзгерту үшін"
                  />
                </div>
                <div>
                  <label htmlFor="newPassword">Жаңа құпия сөз</label>
                  <input
                    id="newPassword"
                    className={isAdmin ? "ap-input" : "form-control"}
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Жаңа құпия сөз"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword">Құпия сөзді растау</label>
                  <input
                    id="confirmPassword"
                    className={isAdmin ? "ap-input" : "form-control"}
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Жаңа құпия сөзді қайталау"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className={isAdmin ? "ap-card profile-card" : "data-card profile-card"} style={{ marginTop: 20 }}>
          <div className="profile-actions" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ marginBottom: 6 }}>Telegram</h3>
              <p className={isAdmin ? "ap-page-sub" : "text-muted"} style={{ margin: 0 }}>
                {telegramStatus?.linked ? 'Байланыс қосылған' : 'Байланыс қосылмаған'}
                {telegramStatus?.linked && ` · ${telegramStatus.notification_enabled === false ? 'хабарламалар өшірулі' : 'хабарламалар қосулы'}`}
              </p>
            </div>
            {telegramStatus?.linked ? (
              <button type="button" className="btn btn-outline" disabled={telegramBusy} onClick={handleTelegramUnlink}>
                Telegram өшіру
              </button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={telegramBusy} onClick={handleTelegramConnect}>
                {telegramBusy ? 'Жасалуда...' : 'Telegram қосу'}
              </button>
            )}
          </div>
          {telegramLink && (
            <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
              <input className={isAdmin ? "ap-input" : "form-control"} value={telegramLink.code || ''} readOnly />
              {telegramLink.bot_link && (
                <a className="btn btn-secondary" href={telegramLink.bot_link} target="_blank" rel="noreferrer" style={{ width: 'fit-content' }}>
                  Telegram ашу
                </a>
              )}
              <small className={isAdmin ? "ap-page-sub" : "text-muted"}>
                Код {telegramLink.expires_at ? new Date(telegramLink.expires_at).toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' }) : '15 минут'} дейін жарамды.
              </small>
            </div>
          )}
        </div>
          </>
  );

  if (user?.role === 'super_admin') {
    return null;
  }

  if (isAdmin) {
    return <AdminShell>{content}</AdminShell>;
  }

  return (
    <div className="role-layout"><Navbar /><main className="role-main">{content}</main></div>
  );

};

export default Profile;
