import React, { useState, useEffect, useCallback } from 'react';
import api, { showToast } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

export default function SiteContentContacts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const contactFields = [
    { key: 'address', label: 'Мекен-жай', icon: 'fa-map-marker-alt', placeholder: 'Шымкент, Абай ауданы, Жәнібеков к-сі, 12' },
    { key: 'phone', label: 'Телефон нөмірі', icon: 'fa-phone', placeholder: '+7 (7252) 00-00-00' },
    { key: 'email', label: 'Email мекенжайы', icon: 'fa-envelope', placeholder: 'school@janibek.edu.kz' },
    { key: 'hours', label: 'Жұмыс уақыты', icon: 'fa-clock', placeholder: 'Дс–Жм: 08:00–18:00' },
  ];

  const [formValues, setFormValues] = useState({
    address: '', phone: '', email: '', hours: ''
  });
  const [itemIds, setItemIds] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.siteContent.listAll('contacts');
    if (res.success && res.data) {
      const values = {};
      const ids = {};
      res.data.forEach(item => {
        if (item.content_key) {
          values[item.content_key] = item.body || '';
          ids[item.content_key] = item.id;
        }
      });
      setFormValues(prev => ({ ...prev, ...values }));
      setItemIds(ids);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    let hasError = false;

    for (const field of contactFields) {
      const fd = new FormData();
      fd.append('section', 'contacts');
      fd.append('content_key', field.key);
      fd.append('title', field.label);
      fd.append('body', formValues[field.key] || '');
      fd.append('sort_order', contactFields.indexOf(field) + 1);

      let res;
      if (itemIds[field.key]) {
        res = await api.siteContent.update(itemIds[field.key], fd);
      } else {
        res = await api.siteContent.create(fd);
      }
      if (!res.success) { hasError = true; break; }
      if (!itemIds[field.key] && res.data?.id) {
        setItemIds(prev => ({ ...prev, [field.key]: res.data.id }));
      }
    }

    if (hasError) showToast('Сақтау қатесі', 'error');
    else showToast('Барлық контакт ақпараты сақталды', 'success');
    setSaving(false);
  };

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '700px', margin: '20px auto', padding: '30px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}>
            <i className="fas fa-address-card" style={{ color: '#3b82f6', marginRight: '10px' }}></i>Байланыс ақпараты
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Сайттың байланыс бөлімін өңдеу</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Жүктелуде...</div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {contactFields.map(field => (
              <div key={field.key}>
                <label className="ap-form-label">
                  <i className={`fas ${field.icon}`} style={{ color: '#3b82f6', marginRight: '6px' }}></i>{field.label}
                </label>
                <input
                  className="ap-input"
                  value={formValues[field.key] || ''}
                  onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" disabled={saving} className="ap-btn ap-btn-primary">
                {saving ? 'Сақталуда...' : <><i className="fas fa-save" style={{ marginRight: '8px' }}></i>Барлығын сақтау</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminShell>
  );
}
