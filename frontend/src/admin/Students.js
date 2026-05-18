import React, { useState, useEffect, useCallback } from 'react';
import api, { showToast, confirmDelete } from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formFields, setFormFields] = useState({ 
    full_name: '', 
    iin: '', 
    class_name: '', 
    type: 'gifted', 
    reason: '', 
    notes: '' 
  });

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.studentProfiles.list();
      if (res.success) {
        setStudents(res.data || []);
      } else {
        showToast(res.message || 'Қате орын алды', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Сервермен байланыс қатесі', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleFieldChange = (field, value) => {
    setFormFields(prev => ({ ...prev, [field]: value }));
  };

  const openForm = (item) => {
    if (item) {
      setEditingItem(item);
      setFormFields({
        full_name: item.full_name || item.student_name || '',
        iin: item.iin || '',
        class_name: item.class_name || '',
        type: item.profile_type || item.type || 'gifted',
        reason: item.reason || '',
        notes: item.notes || ''
      });
    } else {
      setEditingItem(null);
      setFormFields({ 
        full_name: '', 
        iin: '', 
        class_name: '', 
        type: 'gifted', 
        reason: '', 
        notes: '' 
      });
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleSave = async () => {
    if (!formFields.full_name.trim() || !formFields.iin.trim()) {
      showToast('Аты-жөні мен ЖСН енгізіңіз', 'error');
      return;
    }

    try {
      const payload = {
        ...formFields,
        student_name: formFields.full_name, // API compatibility
        profile_type: formFields.type
      };

      const res = editingItem 
        ? await api.studentProfiles.update(editingItem.id, payload)
        : await api.studentProfiles.create(payload);
      
      if (res.success) {
        showToast('Мәліметтер сақталды', 'success');
        closeForm();
        loadStudents();
      } else {
        showToast(res.message || 'Қате орын алды', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Сервермен байланыс қатесі', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirmDelete())) return;
    try {
      const res = await api.studentProfiles.delete(id);
      if (res.success) {
        showToast('Жойылды', 'success');
        loadStudents();
      } else {
        showToast(res.message || 'Қате орын алды', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Сервермен байланыс қатесі', 'error');
    }
  };

  const filteredStudents = students.filter(s => {
    const name = (s.full_name || s.student_name || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">Оқушыларды басқару</h1>
          <p className="ap-page-sub">Дарынды және үлгерімі төмен оқушылар тізімі</p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm(null)}>
          <i className="fas fa-plus"></i> Оқушы қосу
        </button>
      </div>

      <div className="admin-content">
        {showForm && (
          <div className="form-panel ap-card" style={{ marginBottom: '24px' }}>
            <div className="form-panel-header" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0 }}><i className="fas fa-user-edit"></i> {editingItem ? 'Мәліметті өзгерту' : 'Жаңа оқушы қосу'}</h3>
            </div>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="ap-form-label">Аты-жөні *</label>
                <input className="ap-input" value={formFields.full_name} onChange={(e) => handleFieldChange('full_name', e.target.value)} placeholder="Оқушының ФИО" />
              </div>
              <div className="form-group">
                <label className="ap-form-label">ЖСН *</label>
                <input className="ap-input" value={formFields.iin} onChange={(e) => handleFieldChange('iin', e.target.value)} placeholder="000000000000" maxLength={12} />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Сынып</label>
                <input className="ap-input" value={formFields.class_name} onChange={(e) => handleFieldChange('class_name', e.target.value)} placeholder="10А" />
              </div>
              <div className="form-group">
                <label className="ap-form-label">Түрі</label>
                <select className="ap-input" value={formFields.type} onChange={(e) => handleFieldChange('type', e.target.value)}>
                  <option value="gifted">Дарынды</option>
                  <option value="struggling">Үлгерімі төмен</option>
                </select>
              </div>
              <div className="form-group">
                <label className="ap-form-label">Себебі / Бағыты</label>
                <input className="ap-input" value={formFields.reason} onChange={(e) => handleFieldChange('reason', e.target.value)} placeholder="Математика / Көп сабақ босатады" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="ap-form-label">Қосымша мәлімет</label>
                <textarea className="ap-input" rows={3} value={formFields.notes} onChange={(e) => handleFieldChange('notes', e.target.value)} placeholder="Мәліметтер..."></textarea>
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
            <h3 style={{ margin: 0 }}><i className="fas fa-user-graduate" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> Оқушылар тізімі</h3>
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
                  <th>Аты-жөні</th>
                  <th>Сыныбы</th>
                  <th>Түрі</th>
                  <th>Себебі / Бағыты</th>
                  <th className="text-right">Әрекет</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center" style={{ padding: '40px' }}><i className="fas fa-spinner fa-spin"></i> Жүктелуде...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan={6} className="text-center" style={{ padding: '40px' }}>Оқушы табылған жоқ</td></tr>
                ) : filteredStudents.map(item => (
                  <tr key={item.id}>
                    <td className="td-id">{item.id}</td>
                    <td><span className="td-name">{item.full_name || item.student_name}</span></td>
                    <td>{item.class_name || '—'}</td>
                    <td><span className={`badge ${ (item.profile_type || item.type) === 'gifted' ? 'badge-green' : 'badge-amber'}`}>{ (item.profile_type || item.type) === 'gifted' ? 'Дарынды' : 'Үлгерімі төмен'}</span></td>
                    <td>{item.reason || '—'}</td>
                    <td className="text-right">
                      <div className="actions-cell" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="ap-btn-edit" onClick={() => openForm(item)}><i className="fas fa-edit"></i></button>
                        <button className="ap-btn-del" onClick={() => handleDelete(item.id)}><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

export default AdminStudents;
