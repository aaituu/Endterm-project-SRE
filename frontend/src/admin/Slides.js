import React, { useState, useEffect, useCallback } from 'react';
import api, { showToast, confirmDelete, getImageUrl } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

export default function Slides() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title_kz: '', quote: '', sort_order: 0, is_active: true });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.slides.all();
    if (res.success) setSlides(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ title_kz: '', quote: '', sort_order: slides.length + 1, is_active: true });
    setImageFile(null);
    setImagePreview(null);
    setShowForm(true);
  };

  const openEdit = (slide) => {
    setEditing(slide);
    setForm({ title_kz: slide.title_kz || '', quote: slide.quote || '', sort_order: slide.sort_order || 0, is_active: slide.is_active });
    setImageFile(null);
    setImagePreview(slide.image_url ? getImageUrl(slide.image_url) : null);
    setShowForm(true);
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
    if (!form.title_kz) { showToast('Тақырып міндетті', 'error'); return; }
    setSaving(true);

    const fd = new FormData();
    fd.append('title_kz', form.title_kz);
    fd.append('quote', form.quote);
    fd.append('sort_order', form.sort_order);
    fd.append('is_active', form.is_active);
    if (imageFile) fd.append('image', imageFile);
    else if (editing?.image_url) fd.append('image_url', editing.image_url);

    let res;
    if (editing) {
      res = await api.slides.update(editing.id, fd);
    } else {
      res = await api.slides.create(fd);
    }
    if (res.success) {
      showToast(editing ? 'Слайд жаңартылды' : 'Слайд қосылды', 'success');
      setShowForm(false);
      load();
    } else {
      showToast(res.message || 'Қате', 'error');
    }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!(await confirmDelete('Слайдты жояйыз ба?'))) return;
    const res = await api.slides.delete(id);
    if (res.success) { showToast('Жойылды', 'success'); load(); }
    else showToast(res.message || 'Қате', 'error');
  };

  const toggleActive = async (slide) => {
    const fd = new FormData();
    fd.append('title_kz', slide.title_kz || '');
    fd.append('quote', slide.quote || '');
    fd.append('sort_order', slide.sort_order || 0);
    fd.append('is_active', !slide.is_active);
    if (slide.image_url) fd.append('image_url', slide.image_url);
    const res = await api.slides.update(slide.id, fd);
    if (res.success) load();
    else showToast(res.message || 'Қате', 'error');
  };

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '1000px', margin: '20px auto', padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}>
              <i className="fas fa-images" style={{ color: '#3b82f6', marginRight: '10px' }}></i>Hero Слайдтары
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Басты беттің hero бөлімін басқарыңыз</p>
          </div>
          <button className="ap-btn ap-btn-primary" onClick={openNew}>
            <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>Слайд қосу
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Жүктелуде...</div>
        ) : slides.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--ap-border)' }}>
            <i className="fas fa-images" style={{ fontSize: '32px', marginBottom: '16px', color: 'var(--ap-sidebar-text)', display: 'block' }}></i>
            <p>Слайдтар жоқ. Жоғарыдан "Слайд қосу" батырмасын басыңыз.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {slides.map(slide => (
              <div key={slide.id} style={{ border: '1px solid var(--ap-border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--ap-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                <div style={{ width: '100%', height: '160px', background: slide.image_url ? 'transparent' : 'linear-gradient(135deg,#1e3a5f,#3b82f6)', position: 'relative', overflow: 'hidden' }}>
                  {slide.image_url ? (
                    <img src={getImageUrl(slide.image_url)} alt={slide.title_kz} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display='none'; }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.5)' }}>
                      <i className="fas fa-image" style={{ fontSize: '40px' }}></i>
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                    <span style={{ background: slide.is_active ? '#22c55e' : '#94a3b8', color: '#fff', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: '600' }}>
                      {slide.is_active ? 'Белсенді' : 'Өшірілген'}
                    </span>
                  </div>
                  <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '6px', padding: '2px 8px', fontSize: '11px' }}>
                    №{slide.sort_order}
                  </div>
                </div>
                <div style={{ padding: '16px' }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '600', color: '#f1f5f9', lineClamp: 2 }}>{slide.title_kz}</h3>
                  {slide.quote && <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 14px', fontStyle: 'italic' }}>{slide.quote.substring(0, 60)}...</p>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => toggleActive(slide)} style={{ flex: 1, background: slide.is_active ? 'rgba(217, 119, 6, 0.2)' : 'rgba(22, 163, 74, 0.2)', color: slide.is_active ? '#fcd34d' : '#86efac', border: 'none', padding: '7px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                      {slide.is_active ? <><i className="fas fa-eye-slash"></i> Өшіру</> : <><i className="fas fa-eye"></i> Белсендіру</>}
                    </button>
                    <button onClick={() => openEdit(slide)} style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: 'none', padding: '7px 12px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px' }}>
                      <i className="fas fa-edit"></i>
                    </button>
                    <button onClick={() => remove(slide.id)} style={{ background: '#7f1d1d', color: '#fca5a5', border: 'none', padding: '7px 12px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px' }}>
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
            <div style={{ background: 'var(--ap-card)', border: '1px solid var(--ap-border)', borderRadius: '16px', padding: '32px', maxWidth: '560px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 24px', fontWeight: 'bold', color: '#f8fafc' }}>{editing ? 'Слайдты өңдеу' : 'Жаңа слайд қосу'}</h3>
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="ap-form-label">Тақырып (казакша) *</label>
                  <input className="ap-input" value={form.title_kz} onChange={e => setForm(p => ({ ...p, title_kz: e.target.value }))} placeholder="Слайдтың тақырыбы..." required />
                </div>
                <div>
                  <label className="ap-form-label">Цитата / Сипаттама</label>
                  <textarea className="ap-input" rows="2" value={form.quote} onChange={e => setForm(p => ({ ...p, quote: e.target.value }))} placeholder='"Дәйексөз немесе сипаттама"'></textarea>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="ap-form-label">Реттілік нөмірі</label>
                    <input type="number" className="ap-input" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) }))} min="0" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 0' }}>
                      <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
                      <span className="ap-form-label" style={{ margin: 0 }}>Белсенді</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="ap-form-label">Фон суреті</label>
                  {imagePreview && (
                    <div style={{ marginBottom: '10px', borderRadius: '8px', overflow: 'hidden', height: '120px' }}>
                      <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <label style={{ display: 'block', border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer', color: '#64748b', fontSize: '13px' }}>
                    <i className="fas fa-cloud-upload-alt" style={{ fontSize: '20px', marginBottom: '6px', display: 'block', color: '#3b82f6' }}></i>
                    {imageFile ? imageFile.name : 'Сурет таңдаңыз (JPEG, PNG, max 10MB)'}
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