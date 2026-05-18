import React, { useState, useEffect, useCallback } from 'react';
import api, { showToast, confirmDelete, getImageUrl } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

export default function SiteAdministration() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // User search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    position: '',
    bio: '',
    email: '',
    phone: '',
    sort_order: 0,
    photo_url: ''
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.admin.list();
    if (res.success) setItems(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ full_name: '', position: '', bio: '', email: '', phone: '', sort_order: items.length + 1, photo_url: '' });
    setImageFile(null);
    setImagePreview(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      full_name: item.full_name || '',
      position: item.position || '',
      bio: item.bio || '',
      email: item.email || '',
      phone: item.phone || '',
      sort_order: item.sort_order || 0,
      photo_url: item.photo_url || ''
    });
    setImageFile(null);
    setImagePreview(item.photo_url ? getImageUrl(item.photo_url) : null);
    setSearchQuery('');
    setSearchResults([]);
    setShowForm(true);
  };

  // Search users by IIN or name
  const handleUserSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.request('GET', `/administration/search-user?q=${encodeURIComponent(q)}`);
      if (res.success) setSearchResults(res.data || []);
    } catch (e) {
      console.error(e);
    }
    setSearching(false);
  };

  const selectUserFromSearch = (user) => {
    setForm(prev => ({
      ...prev,
      full_name: user.full_name || prev.full_name,
      photo_url: user.photo_url || prev.photo_url
    }));
    if (user.photo_url) setImagePreview(getImageUrl(user.photo_url));
    setSearchQuery('');
    setSearchResults([]);
    showToast(`${user.full_name} таңдалды`, 'success');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast('Файл 10MB-тан аспауы керек', 'error'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.position) { showToast('Аты-жөні мен лауазымы міндетті', 'error'); return; }
    setSaving(true);
    const fd = new FormData();
    fd.append('full_name', form.full_name);
    fd.append('position', form.position);
    fd.append('bio', form.bio);
    fd.append('email', form.email);
    fd.append('phone', form.phone);
    fd.append('sort_order', form.sort_order);
    if (imageFile) fd.append('photo', imageFile);
    else if (form.photo_url) fd.append('photo_url', form.photo_url);

    let res;
    if (editing) {
      res = await api.admin.update(editing.id, fd);
    } else {
      res = await api.admin.create(fd);
    }
    if (res.success) { showToast(editing ? 'Жаңартылды' : 'Қосылды', 'success'); setShowForm(false); load(); }
    else showToast(res.message || 'Қате', 'error');
    setSaving(false);
  };

  const remove = async (id) => {
    if (!(await confirmDelete('Қызметкерді жояйыз ба?'))) return;
    const res = await api.admin.delete(id);
    if (res.success) { showToast('Жойылды', 'success'); load(); }
    else showToast(res.message || 'Қате', 'error');
  };

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '1000px', margin: '20px auto', padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}>
              <i className="fas fa-users-tie" style={{ color: '#3b82f6', marginRight: '10px' }}></i>Мектеп Администрациясы
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Сайттың "Мектеп Администрациясы" бөлімін басқарыңыз</p>
          </div>
          <button className="ap-btn ap-btn-primary" onClick={openNew}>
            <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>Қосу
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Жүктелуде...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--ap-border)' }}>
            <i className="fas fa-users-tie" style={{ fontSize: '32px', marginBottom: '16px', color: 'var(--ap-sidebar-text)', display: 'block' }}></i>
            <p>Администрация мүшелері жоқ</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {items.map(item => (
              <div key={item.id} style={{ border: '1px solid var(--ap-border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--ap-card)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', gap: '10px' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.photo_url ? (
                      <img src={getImageUrl(item.photo_url)} alt={item.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display='none'; }} />
                    ) : (
                      <i className="fas fa-user-tie" style={{ color: '#60a5fa', fontSize: '24px' }}></i>
                    )}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontWeight: '600', color: '#f1f5f9', margin: '0 0 4px', fontSize: '14px' }}>{item.full_name}</h3>
                    <p style={{ color: '#60a5fa', fontSize: '12px', margin: '0 0 6px' }}>{item.position}</p>
                    {item.email && <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0 }}>{item.email}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button onClick={() => openEdit(item)} style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: 'none', padding: '6px 16px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px' }}>
                      <i className="fas fa-edit"></i>
                    </button>
                    <button onClick={() => remove(item.id)} style={{ background: '#7f1d1d', color: '#fca5a5', border: 'none', padding: '6px 16px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px' }}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'var(--ap-card)', border: '1px solid var(--ap-border)', borderRadius: '16px', padding: '32px', maxWidth: '560px', width: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
              <h3 style={{ margin: '0 0 24px', fontWeight: 'bold', color: '#f8fafc' }}>{editing ? 'Қызметкерді өңдеу' : 'Жаңа қызметкер қосу'}</h3>

              {/* User Search */}
              <div style={{ marginBottom: '20px', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.2)', borderRadius: '10px', padding: '16px' }}>
                <p style={{ color: '#38bdf8', fontSize: '12px', margin: '0 0 8px', fontWeight: '500' }}>
                  <i className="fas fa-search" style={{ marginRight: '6px' }}></i>ЖСН немесе ФИО бойынша пайдаланушыны табу
                </p>
                <div style={{ position: 'relative' }}>
                  <input
                    className="ap-input"
                    placeholder="ЖСН немесе аты-жөні..."
                    value={searchQuery}
                    onChange={handleUserSearch}
                    style={{ marginBottom: 0 }}
                  />
                  {searching && <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}><i className="fas fa-spinner fa-spin"></i></span>}
                </div>
                {searchResults.length > 0 && (
                  <div style={{ marginTop: '8px', border: '1px solid var(--ap-border)', borderRadius: '8px', overflow: 'hidden', background: 'var(--ap-card)' }}>
                    {searchResults.map(user => (
                      <button key={user.id} onClick={() => selectUserFromSearch(user)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--ap-border)', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', overflow: 'hidden', flexShrink: 0 }}>
                          {user.photo_url ? <img src={getImageUrl(user.photo_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className="fas fa-user" style={{ color: '#93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}></i>}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '13px', color: '#f1f5f9' }}>{user.full_name}</div>
                          <div style={{ color: '#94a3b8', fontSize: '11px' }}>{user.iin} · {user.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="ap-form-label">Аты-жөні *</label>
                    <input className="ap-input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="ap-form-label">Лауазымы *</label>
                    <input className="ap-input" value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} required />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="ap-form-label">Email</label>
                    <input type="email" className="ap-input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="ap-form-label">Телефон</label>
                    <input className="ap-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="ap-form-label">Биografia</label>
                  <textarea className="ap-input" rows="2" value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}></textarea>
                </div>
                <div>
                  <label className="ap-form-label">Реттілік нөмірі</label>
                  <input type="number" className="ap-input" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) }))} />
                </div>
                <div>
                  <label className="ap-form-label">Фото</label>
                  {imagePreview && (
                    <div style={{ marginBottom: '10px', width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden' }}>
                      <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <label style={{ display: 'block', border: '2px dashed var(--ap-border)', borderRadius: '8px', padding: '12px', textAlign: 'center', cursor: 'pointer', color: '#64748b', fontSize: '13px' }}>
                    <i className="fas fa-camera" style={{ marginRight: '6px', color: '#3b82f6' }}></i>
                    {imageFile ? imageFile.name : 'Фото таңдаңыз (немесе жоғарыдан пайдаланушыны іздеңіз)'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                  <button type="button" onClick={() => setShowForm(false)} className="ap-btn" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none' }}>Болдырмау</button>
                  <button type="submit" disabled={saving} className="ap-btn ap-btn-primary">{saving ? 'Сақталуда...' : 'Сақтау'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
