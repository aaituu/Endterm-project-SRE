import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

const AdminNews = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formFields, setFormFields] = useState({
    title: '',
    event_type: '',
    date: '',
    description: '',
    status: 'approved',
    recommended: false,
    image: null
  });

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setLoading(true);
    try {
      const res = await api.news.adminList();
      setNews(res.success ? res.data || [] : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = news.filter(item => {
    const query = searchQuery.toLowerCase();
    return !query || item.title?.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query) || item.event_type?.toLowerCase().includes(query);
  });

  const openForm = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormFields({
        title: item.title || '',
        event_type: item.event_type || '',
        date: item.date ? item.date.split('T')[0] : '',
        description: item.description || '',
        status: item.status || 'approved',
        recommended: !!item.recommended,
        image: null
      });
    } else {
      setEditingItem(null);
      setFormFields({
        title: '',
        event_type: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        status: 'approved',
        recommended: false,
        image: null
      });
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormFields({
      title: '',
      event_type: '',
      date: '',
      description: '',
      status: 'approved',
      recommended: false,
      image: null
    });
  };

  const handleFieldChange = (key, value) => {
    setFormFields(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!formFields.title.trim() || !formFields.description.trim()) {
      showToast('Тақырып пен сипаттаманы толтырыңыз', 'error');
      return;
    }

    const fd = new FormData();
    fd.append('title', formFields.title.trim());
    fd.append('description', formFields.description.trim());
    fd.append('event_type', (formFields.event_type || '').trim());
    fd.append('date', formFields.date);
    fd.append('recommended', formFields.recommended ? 'true' : 'false');
    fd.append('status', formFields.status);
    if (formFields.image) fd.append('image', formFields.image);

    try {
      const res = editingItem
        ? await api.news.update(editingItem.id, fd)
        : await api.news.create(fd);

      if (res.success) {
        showToast(editingItem ? 'Жаңалық сақталды' : 'Жаңалық қосылды', 'success');
        closeForm();
        loadNews();
      } else {
        showToast(res.message || 'Қате орын алды', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Сервермен байланыс қатесі', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Жаңалықты жойғыңыз келетінін растайсыз ба?')) return;
    try {
      const res = await api.news.delete(id);
      if (res.success) {
        showToast('Жаңалық жойылды', 'success');
        loadNews();
      } else {
        showToast(res.message || 'Қате орын алды', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Сервермен байланыс қатесі', 'error');
    }
  };

  const handleStatus = async (id, status) => {
    try {
      const res = await api.news.updateStatus(id, status);
      if (res.success) {
        showToast('Күйі жаңартылды', 'success');
        loadNews();
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
          <h1 className="ap-page-title">Жаңалықтарды басқару</h1>
          <p className="ap-page-sub">Сайттағы жаңалықтар мен хабарландыруларды жариялау</p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm(null)}>
          <i className="fas fa-plus"></i> Жаңалық қосу
        </button>
      </div>

      <div className="admin-content">
        {showForm && (
          <div className="form-panel ap-card" style={{ marginBottom: '24px' }}>
            <div className="form-panel-header" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0 }}><i className="fas fa-edit"></i> {editingItem ? 'Жаңалықты өзгерту' : 'Жаңа жаңалық'}</h3>
            </div>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="ap-form-label">Тақырып *</label>
                <input className="ap-input" value={formFields.title} onChange={(e) => handleFieldChange('title', e.target.value)} placeholder="Жаңалық тақырыбы" />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Оқиға түрі</label>
                <input className="ap-input" value={formFields.event_type} onChange={(e) => handleFieldChange('event_type', e.target.value)} placeholder="Ғылым, мереке..." />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Күні</label>
                <input className="ap-input" type="date" value={formFields.date} onChange={(e) => handleFieldChange('date', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="ap-form-label">Сипаттама *</label>
                <textarea className="ap-input" rows="4" value={formFields.description} onChange={(e) => handleFieldChange('description', e.target.value)} placeholder="Жаңалық мазмұны..."></textarea>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Сурет</label>
                <input className="ap-input" type="file" accept="image/*" onChange={(e) => handleFieldChange('image', e.target.files[0])} />
                {editingItem && editingItem.image_url && !formFields.image && (
                  <small style={{ color: 'var(--text-muted)' }}>Ағымдағы сурет сақталады</small>
                )}
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '28px' }}>
                <input type="checkbox" checked={formFields.recommended} onChange={(e) => handleFieldChange('recommended', e.target.checked)} id="rec-check" />
                <label htmlFor="rec-check" style={{ fontSize: '0.88rem', cursor: 'pointer' }}>Ұсынылған (Басты бетте көрінеді)</label>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Күйі</label>
                <select className="ap-input" value={formFields.status} onChange={(e) => handleFieldChange('status', e.target.value)}>
                  <option value="approved">Расталған (Бекітілді)</option>
                  <option value="pending">Күтуде</option>
                  <option value="rejected">Қабылданбады</option>
                </select>
              </div>
            </div>
            <div className="form-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" onClick={handleSave}><i className="fas fa-save"></i> Сақтау</button>
              <button className="btn btn-secondary" onClick={closeForm}>Болдырмау</button>
            </div>
          </div>
        )}

        <div className="data-table-card ap-card">
          <div className="data-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
            <h3 style={{ margin: 0 }}><i className="fas fa-list"></i> Барлық жаңалықтар</h3>
            <div className="table-search" style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
              <input className="ap-input" style={{ paddingLeft: '35px', width: '250px' }} placeholder="Іздеу..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th width="50">#</th>
                  <th>Тақырып</th>
                  <th>Күйі</th>
                  <th>Түрі</th>
                  <th>Күні</th>
                  <th>Көрулер</th>
                  <th>Ұсынылған</th>
                  <th className="text-right">Әрекет</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="text-center"><i className="fas fa-spinner fa-spin"></i> Жүктелуде...</td></tr>
                ) : filteredNews.length === 0 ? (
                  <tr><td colSpan="8" className="text-center">Жаңалық табылған жоқ</td></tr>
                ) : filteredNews.map(item => {
                  const statusClass = item.status === 'approved' ? 'badge-green' : item.status === 'rejected' ? 'badge-red' : 'badge-amber';
                  const statusText = item.status === 'approved' ? 'Бекітілді' : item.status === 'rejected' ? 'Қабылданбады' : 'Күтуде';
                  return (
                    <tr key={item.id}>
                      <td className="td-id">{item.id}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>
                      </td>
                      <td><span className={`badge ${statusClass}`}>{statusText}</span></td>
                      <td>{item.event_type ? <span className="badge badge-blue">{item.event_type}</span> : '—'}</td>
                      <td>{item.date ? new Date(item.date).toLocaleDateString('kk-KZ') : '—'}</td>
                      <td><i className="fas fa-eye" style={{ color: 'var(--text-muted)', marginRight: '4px' }}></i>{item.views || 0}</td>
                      <td>{item.recommended ? <span className="badge badge-green"><i className="fas fa-check"></i></span> : '—'}</td>
                      <td className="text-right">
                        <div className="actions-cell" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                          {item.status === 'pending' && (
                            <button className="ap-btn-edit" style={{ background: 'var(--success)', border: 'none', color: '#fff' }} onClick={() => handleStatus(item.id, 'approved')} title="Бекіту">
                              <i className="fas fa-check"></i>
                            </button>
                          )}
                          <button className="ap-btn-edit" onClick={() => openForm(item)} title="Өзгерту"><i className="fas fa-edit"></i></button>
                          <button className="ap-btn-del" onClick={() => handleDelete(item.id)} title="Жою"><i className="fas fa-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

export default AdminNews;

