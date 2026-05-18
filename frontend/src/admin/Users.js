import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

const Users = () => {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    iin: '',
    password: '',
    role_id: '',
    is_active: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    setUser(api.getUser());
    const boot = async () => {
      await loadRoles();
      const r = searchParams.get('role_id') || '';
      const s = searchParams.get('search') || '';
      setSelectedRole(r);
      setSearchQuery(s);
      await loadUsers(1, { roleId: r, search: s });
    };
    boot();
  }, [searchParams]);

  const loadRoles = async () => {
    try {
      const res = await api.roles.list();
      if (res.success) {
        setRoles(res.data);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadUsers = async (page = 1, options = {}) => {
    setLoading(true);
    try {
      const roleFilter = options.roleId !== undefined ? options.roleId : selectedRole;
      const searchValue = options.search !== undefined ? options.search : searchQuery;
      let urlParams = `page=${page}&limit=15&search=${encodeURIComponent(searchValue)}`;
      if (roleFilter) urlParams += `&role_id=${roleFilter}`;

      const res = await api.users.list(urlParams);
      if (res.success) {
        setUsers(res.data || []);
        setCurrentPage(page);
        setTotalPages(res.pagination?.pages || 1);
        setTotalCount(res.pagination?.total || 0);
      } else {
        setUsers([]);
        showToast(res.message || 'Қате орын алды', 'error');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
      showToast('Пайдаланушыларды жүктеу мүмкін болмады', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadUsers(1, { search: searchQuery });
  };

  const handleRoleFilter = (roleId) => {
    setSelectedRole(roleId);
    setCurrentPage(1);
    loadUsers(1, { roleId });
  };

  const openCreateForm = () => {
    setEditingUser(null);
    setFormData({
      full_name: '',
      iin: '',
      password: '',
      role_id: '',
      is_active: true
    });
    setShowPassword(false);
    setShowForm(true);
  };

  const openEditForm = async (userId) => {
    try {
      const res = await api.users.get(userId);
      if (res.success) {
        const userData = res.data;
        const role = roles.find(r => r.name === userData.role);
        setEditingUser(userData);
        setFormData({
          full_name: userData.full_name || '',
          iin: userData.iin || '',
          password: '',
          role_id: role ? role.id : '',
          is_active: userData.is_active
        });
        setShowPassword(false);
        setShowForm(true);
      } else {
        showToast(res.message || 'Пайдаланушыны жүктеу мүмкін болмады', 'error');
      }
    } catch (error) {
      console.error('Error loading user for edit:', error);
      showToast('Пайдаланушыны жүктеу мүмкін болмады', 'error');
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      full_name: '',
      iin: '',
      password: '',
      role_id: '',
      is_active: true
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const { full_name, iin, password, role_id, is_active } = formData;

    if (!full_name.trim() || !iin.trim() || !role_id) {
      showToast('Барлық міндетті өрістерді толтырыңыз', 'error');
      return;
    }

    if (iin.length !== 12 || !/^\d+$/.test(iin)) {
      showToast('ЖСН 12 саннан тұруы керек', 'error');
      return;
    }

    if (!editingUser && !password) {
      showToast('Жаңа пайдаланушы үшін пароль міндетті', 'error');
      return;
    }

    if (password && password.length < 6) {
      showToast('Пароль кемінде 6 таңба', 'error');
      return;
    }

    try {
      const payload = {
        full_name: full_name.trim(),
        iin: iin.trim(),
        role_id: parseInt(role_id),
        is_active
      };

      if (password) payload.password = password;

      const res = editingUser
        ? await api.users.update(editingUser.id, payload)
        : await api.users.create(payload);

      if (res.success) {
        showToast(editingUser ? 'Пайдаланушы жаңартылды' : 'Пайдаланушы сәтті жасалды', 'success');
        closeForm();
        loadUsers(currentPage);
      } else {
        showToast(res.message || 'Қате орын алды', 'error');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      showToast('Пайдаланушыны сақтау мүмкін болмады', 'error');
    }
  };

  const handleViewUser = async (userId) => {
    try {
      const res = await api.users.get(userId);
      if (res.success) {
        setViewingUser(res.data);
        setViewModalOpen(true);
      } else {
        showToast(res.message || 'Пайдаланушыны жүктеу мүмкін болмады', 'error');
      }
    } catch (error) {
      console.error('Error loading user for view:', error);
      showToast('Пайдаланушыны жүктеу мүмкін болмады', 'error');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`"${userName}" пайдаланушысын жойғыңыз келе ме?`)) {
      return;
    }

    try {
      const res = await api.users.delete(userId);
      if (res.success) {
        showToast('Пайдаланушы жойылды', 'success');
        loadUsers(currentPage);
      } else {
        showToast(res.message || 'Қате орын алды', 'error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Пайдаланушыны жою мүмкін болмады', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('kk-KZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('kk-KZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    `;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  };

  const getRoleBadgeClass = (role) => {
    const classes = {
      admin: 'badge-amber',
      teacher: 'badge-blue',
      student: 'badge-green'
    };
    return classes[role] || 'badge-blue';
  };

  if (!user) return null;

  const roleLabel = (slug) => {
    const r = roles.find((x) => x.name === slug);
    return r?.display_name || r?.label_kz || slug;
  };

  return (
    <AdminShell>
          {/* Page Header */}
          <div className="admin-page-header" style={{ alignItems: 'flex-start' }}>
            <div>
              <h1 className="ap-page-title" style={{ marginBottom: 4 }}>Пайдаланушыларды басқару</h1>
              <p className="ap-page-sub">Барлығы: <strong>{totalCount}</strong> пайдаланушы</p>
            </div>
            <button className="btn btn-primary" style={{ textTransform: 'uppercase', fontWeight: 800 }} onClick={openCreateForm}>
              + Пайдаланушы құру
            </button>
          </div>

          {/* Create/Edit Form */}
          {showForm && (
            <div className="form-panel" id="userFormPanel">
              <h3 id="formTitle">
                <i className={`fas ${editingUser ? 'fa-pencil-alt' : 'fa-user-plus'}`}></i>
                {editingUser ? 'Пайдаланушыны өзгерту' : 'Жаңа пайдаланушы'}
              </h3>
              <form id="userForm" onSubmit={handleFormSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="ap-form-label">Аты-жөні <span style={{color:'var(--danger)'}}>*</span></label>
                    <input
                      type="text"
                      className="ap-input"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      placeholder="Иванов Иван Иванович"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="ap-form-label">ЖСН (ИИН) <span style={{color:'var(--danger)'}}>*</span></label>
                    <input
                      type="text"
                      className="ap-input"
                      value={formData.iin}
                      onChange={(e) => setFormData({...formData, iin: e.target.value})}
                      placeholder="123456789012"
                      maxLength="12"
                      pattern="\d{12}"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="ap-form-label">
                      Құпия сөз {!editingUser && <span style={{color:'var(--danger)'}}>*</span>}
                    </label>
                    <div className="input-group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="ap-input"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Кемінде 6 таңба"
                        required={!editingUser}
                      />
                      <i
                        className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                        style={{
                          position:'absolute',
                          right:'14px',
                          top:'50%',
                          transform:'translateY(-50%)',
                          cursor:'pointer',
                          color:'var(--text-muted)'
                        }}
                        onClick={() => setShowPassword(!showPassword)}
                      ></i>
                    </div>
                    {editingUser && (
                      <small style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>
                        Парольді өзгертпесеңіз бос қалдырыңыз
                      </small>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="ap-form-label">Рөлі <span style={{color:'var(--danger)'}}>*</span></label>
                    <select
                      className="ap-input"
                      value={formData.role_id}
                      onChange={(e) => setFormData({...formData, role_id: e.target.value})}
                      required
                    >
                      <option value="">Рөл таңдаңыз...</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.display_name || role.label_kz || role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="ap-form-label">Белсенді</label>
                    <select
                      className="ap-input"
                      value={formData.is_active.toString()}
                      onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
                    >
                      <option value="true">Иә</option>
                      <option value="false">Жоқ</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-save"></i> Сақтау
                  </button>
                  <button type="button" className="btn" onClick={closeForm} style={{background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text)'}}>
                    <i className="fas fa-times"></i> Болдырмау
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users Table */}
          <div className="data-table-card">
            <div className="data-table-header">
              <h3><i className="fas fa-users" style={{color:'var(--primary)'}}></i> Барлық пайдаланушылар
                <span id="totalCount" style={{color:'var(--text-muted)',fontSize:'0.82rem',fontWeight:400,marginLeft:'8px'}}>
                  ({totalCount} жазба)
                </span>
              </h3>
                <div className="table-search" style={{display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'}}>
                <select
                  id="roleFilter"
                  className="ap-input"
                  style={{maxWidth:'220px'}}
                  value={selectedRole}
                  onChange={(e) => handleRoleFilter(e.target.value)}
                >
                  <option value="">Барлық рөлдер</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.display_name || role.label_kz || role.name}
                    </option>
                  ))}
                </select>
                <div className="input-group" style={{position:'relative',flex:1,minWidth:200}}>
                  <i className="fas fa-search input-icon" style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}}></i>
                  <input
                    type="text"
                    id="searchInput"
                    className="ap-input"
                    placeholder="ID, ФИО, ИИН, Ролі..."
                    style={{paddingLeft:'40px'}}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <button className="btn btn-primary btn-sm" id="searchBtn" onClick={handleSearch}>
                  <i className="fas fa-search"></i> Іздеу
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ФИО</th>
                    <th>ИИН</th>
                    <th>Рөлі</th>
                    <th>Күйі</th>
                    <th>Тіркелген</th>
                    <th>Әрекеттер</th>
                  </tr>
                </thead>
                <tbody id="usersTableBody">
                  {loading ? (
                    <tr><td colSpan="6" className="loading-spinner"><i className="fas fa-spinner fa-spin"></i></td></tr>
                  ) : users.length > 0 ? (
                    users.map(u => {
                      const initials = u.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
                      return (
                        <tr key={u.id}>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                              <div style={{
                                width:'34px',
                                height:'34px',
                                borderRadius:'50%',
                                background:'var(--primary)',
                                display:'flex',
                                alignItems:'center',
                                justifyContent:'center',
                                fontSize:'0.8rem',
                                fontWeight:700,
                                color:'var(--white)',
                                flexShrink:0
                              }}>
                                {initials}
                              </div>
                              <span className="td-name">{u.full_name}</span>
                            </div>
                          </td>
                          <td className="td-iin">{u.iin}</td>
                          <td><span className="badge badge-blue" style={{ borderRadius: 999 }}>{roleLabel(u.role)}</span></td>
                          <td>
                            <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                              <span className="status-dot"></span>{u.is_active ? 'Белсенді' : 'Белсенді емес'}
                            </span>
                          </td>
                          <td style={{color:'var(--text-muted)',fontSize:'0.82rem'}}>{formatDate(u.created_at)}</td>
                          <td>
                            <div className="actions-cell" style={{ gap: 8 }}>
                              <button type="button" className="ap-btn-view" onClick={() => handleViewUser(u.id)}>КӨРУ</button>
                              <button type="button" className="ap-btn-edit" onClick={() => openEditForm(u.id)}>ӨЗГЕРТУ</button>
                              <button type="button" className="ap-btn-del" onClick={() => handleDeleteUser(u.id, u.full_name)}>ЖОЮ</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="6"><div className="empty-state"><i className="fas fa-users"></i><h3>Пайдаланушы табылмады</h3></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div id="paginationArea" style={{padding:'16px 20px',borderTop:'1px solid var(--border)'}}>
                <div className="pagination">
                  {currentPage > 1 && (
                    <button className="page-btn wide" onClick={() => loadUsers(currentPage - 1)}>
                      <i className="fas fa-chevron-left"></i> Алдыңғы
                    </button>
                  )}
                  {Array.from({length: totalPages}, (_, i) => i + 1).map(page => {
                    if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2) {
                      return (
                        <button
                          key={page}
                          className={`page-btn${page === currentPage ? ' active' : ''}`}
                          onClick={() => loadUsers(page)}
                        >
                          {page}
                        </button>
                      );
                    } else if (Math.abs(page - currentPage) === 3) {
                      return <span key={page} style={{color:'var(--text-muted)',padding:'0 4px'}}>...</span>;
                    }
                    return null;
                  })}
                  {currentPage < totalPages && (
                    <button className="page-btn wide" onClick={() => loadUsers(currentPage + 1)}>
                      Келесі <i className="fas fa-chevron-right"></i>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

      {/* View Modal */}
      {viewModalOpen && viewingUser && (
        <div className="modal-overlay open" id="viewModal" onClick={() => setViewModalOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3><i className="fas fa-user" style={{color:'var(--primary)',marginRight:'8px'}}></i> Пайдаланушы профилі</h3>
              <button className="modal-close" id="closeViewModal" onClick={() => setViewModalOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-card">
                <div className="detail-header">
                  <div className="detail-avatar" id="viewAvatar">
                    {viewingUser.full_name ? viewingUser.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'U'}
                  </div>
                  <div className="detail-info">
                    <h2 id="viewName">{viewingUser.full_name}</h2>
                    <div id="viewRoleBadge">
                      <span className={`badge ${getRoleBadgeClass(viewingUser.role)}`} style={{fontSize:'0.85rem'}}>
                        {viewingUser.role}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="detail-meta">
                  <div className="detail-field">
                    <label>ЖСН</label>
                    <span id="viewIin" style={{fontFamily:'monospace',letterSpacing:'1px'}}>
                      {viewingUser.iin}
                    </span>
                  </div>
                  <div className="detail-field">
                    <label>Рөлі</label>
                    <span id="viewRole">{viewingUser.role}</span>
                  </div>
                  <div className="detail-field">
                    <label>Күйі</label>
                    <span id="viewStatus">{viewingUser.is_active ? 'Белсенді' : 'Белсенді емес'}</span>
                  </div>
                  <div className="detail-field">
                    <label>Құрылған күні</label>
                    <span id="viewCreated">{formatDateTime(viewingUser.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </AdminShell>
  );
};

export default Users;