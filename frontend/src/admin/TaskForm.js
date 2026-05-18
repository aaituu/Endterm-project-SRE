import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import AdminShell from '../components/AdminShell.js';
import '../../css/style.css';
import '../../css/admin.css';

const TaskForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const editorRef = useRef(null);
  const [teachers, setTeachers] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [workflowStatus, setWorkflowStatus] = useState('not_started');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = '/login';
      return;
    }
    (async () => {
      const tRes = await api.teachers.list('limit=500');
      if (tRes.success) setTeachers(tRes.data || []);
      if (isEdit) {
        const res = await api.tasks.get(id);
        if (res.success && res.data) {
          const d = res.data;
          setTitle(d.title || '');
          setDescription(d.description || '');
          setTeacherId(d.teacher_id ? String(d.teacher_id) : '');
          setPriority(d.priority || 'medium');
          setWorkflowStatus(d.workflow_status || 'not_started');
          if (d.deadline) {
            const dt = new Date(d.deadline);
            setDeadline(dt.toISOString().slice(0, 16));
          }
          setTimeout(() => {
            if (editorRef.current) editorRef.current.innerHTML = d.description || '';
          }, 0);
        }
      } else {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setDeadline(now.toISOString().slice(0, 16));
      }
    })();
  }, [id, isEdit]);

  const exec = (cmd) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, null);
  };

  const syncHtml = () => {
    if (editorRef.current) setDescription(editorRef.current.innerHTML);
  };

  const save = async () => {
    syncHtml();
    const html = editorRef.current ? editorRef.current.innerHTML : description;
    const deadlineIso = deadline ? new Date(deadline).toISOString() : null;
    if (!title.trim() || !teacherId) {
      alert('Тақырып пен мұғалім міндетті');
      return;
    }
    if (isEdit) {
      const res = await api.tasks.update(id, {
        title: title.trim(),
        description: html,
        teacher_id: Number(teacherId),
        priority,
        workflow_status: workflowStatus,
        deadline: deadlineIso
      });
      if (res.success) navigate('/admin/tasks');
      else alert(res.message || 'Қате');
    } else {
      const res = await api.tasks.createJson({
        title: title.trim(),
        description: html,
        teacher_id: Number(teacherId),
        priority,
        workflow_status: workflowStatus,
        deadline: deadlineIso
      });
      if (res.success) navigate('/admin/tasks');
      else alert(res.message || 'Қате');
    }
  };

  return (
    <AdminShell>
      <div className="admin-page-header">
        <div>
          <h1 className="ap-page-title">{isEdit ? 'Тапсырманы өңдеу' : 'Жаңа тапсырма құру'}</h1>
          <p className="ap-page-sub">Мұғалімге тапсырма беру</p>
        </div>
        <Link to="/admin/tasks" className="btn btn-secondary">← Тізім</Link>
      </div>

      <div className="form-panel">
        <h3>Тапсырма мәліметтері</h3>
        <div className="form-group">
          <label className="ap-form-label">Тапсырма атауы *</label>
          <input className="ap-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Тапсырма атауын енгізіңіз" />
        </div>
        <div className="form-group">
          <label className="ap-form-label">Тапсырма сипаттамасы *</label>
          <div className="ap-mini-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => exec('bold')}><b>B</b></button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => exec('italic')}><i>I</i></button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => exec('insertUnorderedList')}>•</button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => exec('insertOrderedList')}>1.</button>
          </div>
          <div
            ref={editorRef}
            className="ap-input"
            contentEditable
            suppressContentEditableWarning
            onBlur={syncHtml}
            style={{ minHeight: 180, overflow: 'auto' }}
          />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="ap-form-label">Мұғалім таңдау *</label>
            <select className="ap-input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">Мұғалімдерді таңдаңыз</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="ap-form-label">Приоритет *</label>
            <select className="ap-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">Төмен</option>
              <option value="medium">Орташа</option>
              <option value="high">Жоғары</option>
            </select>
          </div>
          <div className="form-group">
            <label className="ap-form-label">Статус</label>
            <select className="ap-input" value={workflowStatus} onChange={(e) => setWorkflowStatus(e.target.value)}>
              <option value="not_started">Күтілуде</option>
              <option value="in_progress">Орындалуда</option>
              <option value="completed">Орындалды</option>
            </select>
          </div>
          <div className="form-group">
            <label className="ap-form-label">Орындау мерзімі *</label>
            <input className="ap-input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            <small style={{ color: '#64748b' }}>Тапсырманы орындау үшін соңғы мерзім</small>
          </div>
        </div>
        <div className="form-actions">
          <Link to="/admin/tasks" className="btn btn-secondary">Бас тарту</Link>
          <button type="button" className="btn btn-primary" onClick={save}>{isEdit ? 'Сақтау' : 'Тапсырма құру'}</button>
        </div>
      </div>
    </AdminShell>
  );
};

export default TaskForm;
