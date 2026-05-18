import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminShell from '../components/SuperAdminShell.js';
import api, { showToast } from '../utils/api.js';

export default function SuperAdminSchools() {
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', code: '', domain: '', subdomain: '' });
  const navigate = useNavigate();

  const loadSchools = async (params = '') => {
    setLoading(true);
    const res = await api.schools.list(params);
    if (res.success) {
      setSchools(res.data || []);
    } else {
      showToast(res.message || 'Мектептер жүктелмеді', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSchools('limit=50');
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.slug || !form.code) return showToast('Аты, slug және код қажет', 'error');
    setCreating(true);
    const res = await api.schools.create(form);
    if (res.success) {
      const admin = res.data?.default_admin;
      const password = res.data?.default_password;
      showToast(admin ? `Мектеп құрылды. Admin ЖСН: ${admin.iin}, пароль: ${password}` : 'Мектеп қосылды', 'success');
      setForm({ name: '', slug: '', code: '', domain: '', subdomain: '' });
      loadSchools('limit=50');
    } else {
      showToast(res.message || 'Қосу мүмкін болмады', 'error');
    }
    setCreating(false);
  };

  return (
    <SuperAdminShell>
      <div className="ap-page-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="ap-page-title">Мектептер</h1>
          <p className="ap-page-sub">Жүйеге тіркелген мектептерді қарап, өңдеп, басқаруға болады</p>
        </div>
      </div>

      <div className="data-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: 16 }}>
          <input className="ap-input" placeholder="Іздеу мектеп..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn" onClick={() => loadSchools(`search=${encodeURIComponent(search)}&limit=50`)}>Іздеу</button>
        </div>
        {loading ? (
          <p>Жүктелуде...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Аты</th>
                  <th>Slug</th>
                  <th>Subdomain</th>
                  <th>Код</th>
                  <th>Домейн</th>
                  <th>Статус</th>
                  <th>Дерекқор</th>
                  <th>Қимыл</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.id}>
                    <td>{school.name}</td>
                    <td>{school.slug}</td>
                    <td>{school.subdomain || '—'}</td>
                    <td>{school.code}</td>
                    <td>{school.domain || '—'}</td>
                    <td>{school.is_active ? 'Белсенді' : 'Бұғатталған'}</td>
                    <td>{school.database_status || 'pending'}</td>
                    <td>
                      <button className="btn btn-outline" onClick={() => navigate(`/super-admin/schools/${school.id}`)}>
                        Өңдеу
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="data-card">
        <h3>Жаңа мектеп қосу</h3>
        <div className="form-grid" style={{ gap: 16 }}>
          <input className="ap-input" placeholder="Мектеп атауы" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="ap-input" placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className="ap-input" placeholder="Subdomain (міндетті емес)" value={form.subdomain} onChange={(e) => setForm({ ...form, subdomain: e.target.value })} />
          <input className="ap-input" placeholder="Код" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input className="ap-input" placeholder="Домейн (міндетті емес)" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn" disabled={creating} onClick={handleCreate}>
            {creating ? 'Құру...' : 'Мектеп құру'}
          </button>
        </div>
      </div>
    </SuperAdminShell>
  );
}
