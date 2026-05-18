import React, { useState, useEffect, useCallback } from 'react';
import api, { showToast } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

const PROGRAM_KEYS = [
  { key: 'primary', label: 'Бастауыш сынып (1–4)', icon: 'fa-seedling', tag: '1–4 сынып' },
  { key: 'middle', label: 'Негізгі мектеп (5–9)', icon: 'fa-book', tag: '5–9 сынып' },
  { key: 'high', label: 'Жоғары мектеп (10–11)', icon: 'fa-flask', tag: '10–11 сынып' },
];

export default function SiteContentPrograms() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forms, setForms] = useState({
    primary: { id: null, title: '', body: '' },
    middle: { id: null, title: '', body: '' },
    high: { id: null, title: '', body: '' },
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.siteContent.listAll('programs');
    if (res.success && res.data) {
      const updated = { ...forms };
      res.data.forEach(item => {
        if (item.content_key && updated[item.content_key] !== undefined) {
          updated[item.content_key] = { id: item.id, title: item.title || '', body: item.body || '' };
        }
      });
      setForms(updated);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    let hasError = false;

    for (const prog of PROGRAM_KEYS) {
      const item = forms[prog.key];
      const fd = new FormData();
      fd.append('section', 'programs');
      fd.append('content_key', prog.key);
      fd.append('title', item.title);
      fd.append('body', item.body);
      fd.append('sort_order', PROGRAM_KEYS.indexOf(prog) + 1);

      let res;
      if (item.id) {
        res = await api.siteContent.update(item.id, fd);
      } else {
        res = await api.siteContent.create(fd);
      }
      if (!res.success) { hasError = true; break; }
      if (!item.id && res.data?.id) {
        setForms(prev => ({ ...prev, [prog.key]: { ...prev[prog.key], id: res.data.id } }));
      }
    }

    if (hasError) showToast('Сақтау қатесі', 'error');
    else showToast('Оқу бағдарламасы сақталды', 'success');
    setSaving(false);
  };

  return (
    <AdminShell>
      <div className="ap-card" style={{ maxWidth: '800px', margin: '20px auto', padding: '30px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}>
            <i className="fas fa-book-open" style={{ color: '#3b82f6', marginRight: '10px' }}></i>Оқу бағдарламасы
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Сайттың оқу бағдарламасы бөлімін өңдеу</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Жүктелуде...</div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {PROGRAM_KEYS.map(prog => (
              <div key={prog.key} style={{ background: 'var(--ap-card)', border: '1px solid var(--ap-border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <i className={`fas ${prog.icon}`}></i>
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#f1f5f9', fontSize: '14px' }}>{prog.label}</div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>{prog.tag}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label className="ap-form-label">Атауы</label>
                    <input className="ap-input" value={forms[prog.key].title} onChange={e => setForms(prev => ({ ...prev, [prog.key]: { ...prev[prog.key], title: e.target.value } }))} />
                  </div>
                  <div>
                    <label className="ap-form-label">Сипаттама</label>
                    <textarea className="ap-input" rows="3" value={forms[prog.key].body} onChange={e => setForms(prev => ({ ...prev, [prog.key]: { ...prev[prog.key], body: e.target.value } }))}></textarea>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
