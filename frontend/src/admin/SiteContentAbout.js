import React, { useState, useEffect, useCallback } from 'react';
import api, { showToast } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

export default function SiteContentAbout() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', id: null });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.siteContent.listAll('about');
    if (res.success && res.data?.length > 0) {
      const item = res.data[0];
      setForm({ id: item.id, title: item.title || '', body: item.body || '' });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append('section', 'about');
    fd.append('content_key', 'main');
    fd.append('title', form.title);
    fd.append('body', form.body);

    let res;
    if (form.id) {
      res = await api.siteContent.update(form.id, fd);
    } else {
      res = await api.siteContent.create(fd);
    }
    if (res.success) {
      showToast('Сақталды', 'success');
      if (!form.id && res.data?.id) setForm(p => ({ ...p, id: res.data.id }));
    } else {
      showToast(res.message || 'Қате', 'error');
    }
    setSaving(false);
  };

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '800px', margin: '20px auto', padding: '30px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}>
            <i className="fas fa-school" style={{ color: '#3b82f6', marginRight: '10px' }}></i>Мектеп туралы бөлімі
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Сайттың "Мектеп туралы" бөлімінің мазмұнын өңдеу</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Жүктелуде...</div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="ap-form-label">Мектеп атауы</label>
              <input className="ap-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ө. Жәнібеков атындағы мектеп" />
            </div>
            <div>
              <label className="ap-form-label">Сипаттама мәтіні</label>
              <textarea className="ap-input" rows="6" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Мектеп туралы толық сипаттама..."></textarea>
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
              <i className="fas fa-info-circle" style={{ color: '#3b82f6', marginRight: '6px' }}></i>
              Мекен-жай, байланыс ақпараты — "Контакттар" бөлімінен өңделеді.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={saving} className="ap-btn ap-btn-primary">
                {saving ? 'Сақталуда...' : <><i className="fas fa-save" style={{ marginRight: '8px' }}></i>Сақтау</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminShell>
  );
}
