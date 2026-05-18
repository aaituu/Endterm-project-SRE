import React, { useEffect, useState } from 'react';
import SuperAdminShell from '../components/SuperAdminShell.js';
import api, { showToast } from '../utils/api.js';

export default function SuperAdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = async (query = '') => {
    setLoading(true);
    const res = await api.users.list(query);
    if (res.success) {
      setUsers(res.data || []);
    } else {
      showToast(res.message || 'Пайдаланушылар жүктелмеді', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers('limit=50');
  }, []);

  const onSearch = () => {
    loadUsers(`search=${encodeURIComponent(search)}&limit=50`);
  };

  return (
    <SuperAdminShell>
      <div className="ap-page-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="ap-page-title">Пайдаланушылар</h1>
          <p className="ap-page-sub">Super admin барлық жүйелік пайдаланушыларды қарап шыға алады</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            className="ap-input"
            placeholder="Іздеу ЖСН немесе аты бойынша"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn" onClick={onSearch}>Іздеу</button>
        </div>
      </div>

      <div className="data-card">
        {loading ? (
          <p>Жүктелуде...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Аты-жөні</th>
                  <th>ЖСН</th>
                  <th>Рөлі</th>
                  <th>Мектеп ID</th>
                  <th>Белсенді</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.full_name}</td>
                    <td>{user.iin}</td>
                    <td>{user.role}</td>
                    <td>{user.school_id || '—'}</td>
                    <td>{user.is_active ? 'Иә' : 'Жоқ'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
