import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SuperAdminShell from '../components/SuperAdminShell.js';
import api, { showToast } from '../utils/api.js';

export default function SuperAdminSchoolPanel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', code: '', domain: '', subdomain: '', is_active: true });
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userForm, setUserForm] = useState({ full_name: '', iin: '', role_id: '', is_active: true });
  const [userSaving, setUserSaving] = useState(false);
  const [adminPasswordForm, setAdminPasswordForm] = useState({ admin_iin: '000000000001', password: 'Admin123!' });
  const [adminPasswordSaving, setAdminPasswordSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [schoolRes, usersRes, rolesRes] = await Promise.all([
      api.schools.get(id),
      api.schools.users(id, 'limit=50'),
      api.roles.list()
    ]);

    if (schoolRes.success) {
      setSchool(schoolRes.data);
      setForm({
        name: schoolRes.data.name || '',
        slug: schoolRes.data.slug || '',
        code: schoolRes.data.code || '',
        domain: schoolRes.data.domain || '',
        subdomain: schoolRes.data.subdomain || schoolRes.data.slug || '',
        is_active: schoolRes.data.is_active
      });
    } else {
      showToast(schoolRes.message || 'Мектеп жүктелмеді', 'error');
    }

    if (usersRes.success) setUsers(usersRes.data || []);
    else showToast(usersRes.message || 'Пайдаланушылар жүктелмеді', 'error');

    if (rolesRes.success) setRoles(rolesRes.data || []);
    else showToast(rolesRes.message || 'Рөлдер жүктелмеді', 'error');

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSchoolSave = async () => {
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug,
      code: form.code,
      domain: form.domain || null,
      subdomain: form.subdomain || form.slug,
      is_active: form.is_active
    };

    const res = await api.schools.update(id, payload);
    setSaving(false);

    if (!res.success) {
      return showToast(res.message || 'Мектеп сақталмады', 'error');
    }

    setSchool(res.data);
    setForm((prev) => ({ ...prev, subdomain: res.data.subdomain || prev.subdomain }));
    showToast('Мектеп жаңартылды', 'success');
  };

  const handleUserEdit = async (userId) => {
    setUserSaving(true);
    const res = await api.users.get(userId);
    setUserSaving(false);
    if (!res.success) return showToast(res.message || 'Пайдаланушы табылмады', 'error');

    const role = roles.find((item) => item.name === res.data.role);
    setSelectedUser(res.data);
    setUserForm({
      full_name: res.data.full_name || '',
      iin: res.data.iin || '',
      role_id: role ? role.id : '',
      is_active: res.data.is_active
    });
  };

  const handleUserSave = async () => {
    if (!selectedUser) return;
    if (!userForm.full_name || !userForm.iin || !userForm.role_id) {
      return showToast('Барлық міндетті өрістерді толтырыңыз', 'error');
    }
    setUserSaving(true);
    const payload = {
      full_name: userForm.full_name,
      iin: userForm.iin,
      role_id: parseInt(userForm.role_id, 10),
      is_active: userForm.is_active
    };
    const res = await api.users.update(selectedUser.id, payload);
    setUserSaving(false);

    if (!res.success) return showToast(res.message || 'Пайдаланушы сақталмады', 'error');
    showToast('Пайдаланушы жаңартылды', 'success');
    setSelectedUser(null);
    loadData();
  };

  const handleAdminPasswordReset = async () => {
    if (!adminPasswordForm.password || adminPasswordForm.password.length < 6) {
      return showToast('Пароль кемінде 6 таңбадан тұруы керек', 'error');
    }
    setAdminPasswordSaving(true);
    const res = await api.schools.resetAdminPassword(id, {
      admin_iin: adminPasswordForm.admin_iin || '000000000001',
      password: adminPasswordForm.password
    });
    setAdminPasswordSaving(false);

    if (!res.success) {
      return showToast(res.message || 'Пароль жаңартылмады', 'error');
    }
    showToast(`Пароль жаңартылды. Admin ЖСН: ${res.data?.admin?.iin || adminPasswordForm.admin_iin}`, 'success');
    loadData();
  };

  const impersonate = async () => {
    api.setOriginalSession(api.getToken(), api.getUser());
    setImpersonating(true);
    const res = await api.superAdmin.impersonate(id);
    setImpersonating(false);

    if (res.success) {
      api.setToken(res.data.token);
      api.setUser(res.data.user);
      showToast('Имперсонация сәтті өтті', 'success');
      const subdomain = res.data.school?.subdomain || res.data.user.school_slug;
      const currentHost = window.location.hostname;
      if (subdomain && currentHost === 'localhost') {
        window.location.href = `${window.location.protocol}//${subdomain}.localhost${window.location.port ? `:${window.location.port}` : ''}/admin/dashboard`;
        return;
      }
      if (subdomain && currentHost && currentHost !== '127.0.0.1') {
        const parts = currentHost.split('.');
        const targetHost = parts.length > 2
          ? [subdomain, ...parts.slice(1)].join('.')
          : `${subdomain}.${currentHost}`;
        window.location.href = `${window.location.protocol}//${targetHost}${window.location.port ? `:${window.location.port}` : ''}/admin/dashboard`;
        return;
      }
      navigate('/admin/dashboard');
    } else {
      showToast(res.message || 'Имперсонация мүмкін болмады', 'error');
    }
  };

  if (loading) {
    return (
      <SuperAdminShell>
        <div className="ap-page-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="ap-page-title">Мектеп панелі</h1>
            <p className="ap-page-sub">Мектеп деректері жүктелуде...</p>
          </div>
        </div>
        <p>Жүктелуде...</p>
      </SuperAdminShell>
    );
  }

  if (!school) {
    return (
      <SuperAdminShell>
        <div className="ap-page-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="ap-page-title">Мектеп панелі</h1>
            <p className="ap-page-sub">Мектеп табылмады</p>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/super-admin/schools')}>Мектептерге қайту</button>
        </div>
      </SuperAdminShell>
    );
  }

  return (
    <SuperAdminShell>
      <div className="ap-page-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="ap-page-title">{school.name} — мектеп панелі</h1>
          <p className="ap-page-sub">Мектеп ақпаратын өзгертіп, жеке дерекқор күйін және қолданушыларды көруге болады</p>
        </div>
        <div>
          <button className="btn" disabled={impersonating} onClick={impersonate}>
            {impersonating ? 'Өту...' : 'Админ ретінде кіру'}
          </button>
          <button className="btn btn-outline" style={{ marginLeft: 12 }} onClick={() => navigate('/super-admin/schools')}>
            Мектептерге қайту
          </button>
        </div>
      </div>

      <div className="data-card">
        <h3>Мектеп туралы ақпарат</h3>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <label>Аты</label>
            <input className="ap-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label style={{ marginTop: 12 }}>Slug</label>
            <input className="ap-input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <label style={{ marginTop: 12 }}>Код</label>
            <input className="ap-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <label>Subdomain</label>
            <input className="ap-input" value={form.subdomain} onChange={(e) => setForm({ ...form, subdomain: e.target.value })} />
            <label style={{ marginTop: 12 }}>Домейн</label>
            <input className="ap-input" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
            <label style={{ marginTop: 12 }}>Статус</label>
            <select className="ap-input" value={form.is_active ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}>
              <option value="active">Белсенді</option>
              <option value="inactive">Бұғатталған</option>
            </select>
            <label style={{ marginTop: 12 }}>Дерекқор</label>
            <input className="ap-input" value={`${school.database_status || 'pending'} · ${school.database_name || 'жоқ'}`} readOnly />
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <button className="btn" disabled={saving} onClick={handleSchoolSave}>
            {saving ? 'Сақталуда...' : 'Сақтау'}
          </button>
        </div>
      </div>

      <div className="data-card">
        <h3>Мектеп админінің паролі</h3>
        <p className="ap-page-sub">Осы мектептің жеке админкасына кіретін admin аккаунттың паролін global admin осы жерден өзгерте алады.</p>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <label>Admin ЖСН</label>
            <input
              className="ap-input"
              value={adminPasswordForm.admin_iin}
              maxLength={12}
              onChange={(e) => setAdminPasswordForm({ ...adminPasswordForm, admin_iin: e.target.value.replace(/\D/g, '') })}
            />
          </div>
          <div>
            <label>Жаңа пароль</label>
            <input
              className="ap-input"
              type="text"
              value={adminPasswordForm.password}
              onChange={(e) => setAdminPasswordForm({ ...adminPasswordForm, password: e.target.value })}
            />
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <button className="btn" disabled={adminPasswordSaving} onClick={handleAdminPasswordReset}>
            {adminPasswordSaving ? 'Жаңартылуда...' : 'Парольді жаңарту'}
          </button>
        </div>
      </div>

      <div className="data-card">
        <h3>Тіркелген қолданушылар</h3>
        <p className="ap-page-sub">Қолданушылар осы мектептің жеке дерекқорынан оқылады. Толық басқару үшін “Админ ретінде кіру” батырмасын қолданыңыз.</p>
        {users.length === 0 ? (
          <p>Қолданушылар табылмады</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Аты</th>
                  <th>ЖСН</th>
                  <th>Рөл</th>
                  <th>Белсенділік</th>
                  <th>Қосылған</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userRow) => (
                  <tr key={userRow.id}>
                    <td>{userRow.full_name}</td>
                    <td>{userRow.iin}</td>
                    <td>{userRow.role}</td>
                    <td>{userRow.is_active ? 'Иә' : 'Жоқ'}</td>
                    <td>{new Date(userRow.created_at).toLocaleDateString('kk-KZ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="data-card">
          <h3>Пайдаланушыны өңдеу</h3>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label>Аты-жөні</label>
              <input className="ap-input" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} />
              <label style={{ marginTop: 12 }}>ЖСН</label>
              <input className="ap-input" value={userForm.iin} onChange={(e) => setUserForm({ ...userForm, iin: e.target.value })} />
            </div>
            <div>
              <label>Рөлі</label>
              <select className="ap-input" value={userForm.role_id} onChange={(e) => setUserForm({ ...userForm, role_id: e.target.value })}>
                <option value="">Рөлді таңдаңыз</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              <label style={{ marginTop: 12 }}>Белсенділік</label>
              <select className="ap-input" value={userForm.is_active ? '1' : '0'} onChange={(e) => setUserForm({ ...userForm, is_active: e.target.value === '1' })}>
                <option value="1">Белсенді</option>
                <option value="0">Белсенді емес</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <button className="btn" disabled={userSaving} onClick={handleUserSave}>
              {userSaving ? 'Сақталуда...' : 'Сақтау'}
            </button>
            <button className="btn btn-outline" style={{ marginLeft: 12 }} onClick={() => setSelectedUser(null)}>
              Болдырмау
            </button>
          </div>
        </div>
      )}
    </SuperAdminShell>
  );
}
