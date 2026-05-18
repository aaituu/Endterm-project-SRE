import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

const AdminGallery = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    setLoading(true);
    try {
      const res = await api.gallery.list();
      setItems(res.success ? res.data || [] : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const baseUrl = isLocalDev ? `http://${window.location.hostname}:3001` : '';
    return `${baseUrl}${normalizedPath}`;
  };

  const openForm = () => {
    setFile(null);
    setDescription('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setFile(null);
    setDescription('');
  };

  const handleSave = async () => {
    if (!file) {
      showToast('Суретті таңдаңыз', 'error');
      return;
    }
    const fd = new FormData();
    fd.append('image', file);
    fd.append('description', description.trim());

    try {
      const res = await api.gallery.create(fd);
      if (res.success) {
        showToast('Сурет жүктелді', 'success');
        closeForm();
        loadGallery();
      } else {
        showToast(res.message || 'Қате орын алды', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Сервермен байланыс қатесі', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Суретті жойғыңыз келетінін растаңыз ба?')) return;
    try {
      const res = await api.gallery.delete(id);
      if (res.success) {
        showToast('Сурет жойылды', 'success');
        loadGallery();
      } else {
        showToast(res.message || 'Қате орын алды', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Сервермен байланыс қатесі', 'error');
    }
  };

  const showToast = (message, type = 'info') => {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Галереяны басқару</h1>
          <p className="ap-page-sub">Мектеп өмірінен фотосуреттерді жүктеу және басқару</p>
        </div>
        <button className="btn btn-primary" onClick={openForm}>
          <i className="fas fa-upload"></i> Фото жүктеу
        </button>
      </div>

      <div className="admin-content">
        {showForm && (
          <div className="form-panel ap-card" style={{ marginBottom: '24px' }}>
            <div className="form-panel-header" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0 }}><i className="fas fa-image"></i> Жаңа фотосурет</h3>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="ap-form-label">Сурет *</label>
                <div style={{ position: 'relative' }}>
                  <input className="ap-input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} style={{ padding: '8px' }} />
                  {file && <small style={{ display: 'block', marginTop: '4px', color: 'var(--success)' }}>Таңдалған: {file.name}</small>}
                </div>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Сипаттама</label>
                <input className="ap-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Суреттің сипаттамасы немесе оқиға атауы" />
              </div>
            </div>
            <div className="form-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" onClick={handleSave}><i className="fas fa-upload"></i> Жүктеу</button>
              <button className="btn btn-secondary" onClick={closeForm}>Болдырмау</button>
            </div>
          </div>
        )}

        <div className="ap-card" style={{ padding: '20px' }}>
          <div className="section-header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-images" style={{ color: 'var(--primary)', fontSize: '1.2rem' }}></i>
            <h3 style={{ margin: 0 }}>Барлық фотосуреттер</h3>
          </div>
          
          {loading ? (
            <div className="text-center" style={{ padding: '40px' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Жүктелуде...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state text-center" style={{ padding: '60px 20px' }}>
              <i className="fas fa-photo-video" style={{ fontSize: '3rem', color: 'var(--border)', marginBottom: '16px' }}></i>
              <h3>Фотосуреттер жоқ</h3>
              <p style={{ color: 'var(--text-muted)' }}>Галереяға алғашқы фотоны жүктеңіз</p>
            </div>
          ) : (
            <div className="gallery-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
              gap: '20px' 
            }}>
              {items.map(item => (
                <div key={item.id} className="gallery-item-card" style={{ 
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  border: '1px solid var(--border)', 
                  position: 'relative', 
                  aspectRatio: '4/3', 
                  background: 'var(--bg-3)',
                  transition: 'transform 0.2s',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {item.image_url ? (
                    <img src={getImageUrl(item.image_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={item.description || 'Gallery'} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                      <i className="fas fa-image" style={{ fontSize: '2.5rem' }}></i>
                    </div>
                  )}
                  <div className="gallery-item-overlay" style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'flex-end', 
                    padding: '12px',
                    opacity: description ? 1 : 0.9
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: '#fff', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {item.description || 'Сипаттамасыз'}
                      </span>
                      <button 
                        className="btn-del-sm" 
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.2)', 
                          color: '#fca5a5', 
                          border: '1px solid rgba(239,68,68,0.3)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }} 
                        onClick={() => handleDelete(item.id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
};

export default AdminGallery;
