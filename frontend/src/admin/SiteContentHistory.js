import React, { useState, useEffect, useCallback } from 'react';
import api, { showToast, confirmDelete, getImageUrl } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

export default function SiteContentHistory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ content_key: '', title: '', body: '', sort_order: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.siteContent.listAll('history');
    if (res.success) setItems(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ content_key: '', title: '', body: '', sort_order: items.length + 1 });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ content_key: item.content_key || '', title: item.title || '', body: item.body || '', sort_order: item.sort_order || 0 });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title) { showToast('Атауы міндетті', 'error'); return; }
    setSaving(true);
    const fd = new FormData();
    fd.append('section', 'history');
    fd.append('content_key', form.content_key);
    fd.append('title', form.title);
    fd.append('body', form.body);
    fd.append('sort_order', form.sort_order);
    let res;
    if (editing) {
      res = await api.siteContent.update(editing.id, fd);
    } else {
      res = await api.siteContent.create(fd);
    }
    if (res.success) { showToast(editing ? 'Жаңартылды' : 'Қосылды', 'success'); setShowForm(false); load(); }
    else showToast(res.message || 'Қате', 'error');
    setSaving(false);
  };

  const remove = async (id) => {
    if (!(await confirmDelete('Тарих жазбасын жояйыз ба?'))) return;
    const res = await api.siteContent.delete(id);
    if (res.success) { showToast('Жойылды', 'success'); load(); }
    else showToast(res.message || 'Қате', 'error');
  };

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '900px', margin: '20px auto', padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}>
              <i className="fas fa-landmark" style={{ color: '#3b82f6', marginRight: '10px' }}></i>Мектеп тарихы
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Сайттағы мектеп тарихы бөлімін өңдеу</p>
          </div>
          <button className="ap-btn ap-btn-primary" onClick={openNew}><i className="fas fa-plus" style={{ marginRight: '8px' }}></i>Жаңа оқиға қосу</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Жүктелуде...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--ap-border)' }}>
            <i className="fas fa-landmark" style={{ fontSize: '32px', marginBottom: '16px', color: '#cbd5e1' }}></i>
            <p>Тарих жазбалары жоқ</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map((item, i) => (
              <div key={item.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--ap-border)', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ minWidth: '60px', height: '60px', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>
                  {item.content_key || i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9', margin: '0 0 4px' }}>{item.title}</h3>
                  <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>{item.body}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button onClick={() => openEdit(item)} style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}><i className="fas fa-edit"></i></button>
                  <button onClick={() => remove(item.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}><i className="fas fa-trash"></i></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'var(--ap-card)', border: '1px solid var(--ap-border)', borderRadius: '16px', padding: '32px', maxWidth: '520px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
              <h3 style={{ margin: '0 0 24px', fontWeight: 'bold', color: '#f8fafc' }}>{editing ? 'Оқиғаны өңдеу' : 'Жаңа оқиға қосу'}</h3>
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="ap-form-label">Жыл немесе код (мысалы: 1989)</label>
                  <input className="ap-input" value={form.content_key} onChange={e => setForm(p => ({ ...p, content_key: e.target.value }))} placeholder="1989" />
                </div>
                <div>
                  <label className="ap-form-label">Атауы *</label>
                  <input className="ap-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Мектептің ашылуы" required />
                </div>
                <div>
                  <label className="ap-form-label">Сипаттама</label>
                  <textarea className="ap-input" rows="3" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Толық сипаттама..."></textarea>
                </div>
                <div>
                  <label className="ap-form-label">Реттілік нөмірі</label>
                  <input type="number" className="ap-input" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} />
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
