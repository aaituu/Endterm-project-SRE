import React, { useEffect, useState } from 'react';
import AdminShell from '../components/AdminShell.js';
import api, { showToast, formatDateTime } from '../utils/api.js';
import '../../css/style.css';
import '../../css/admin.css';

const optionBool = (value) => value === true || value === 'true';
const severityLabel = { error: 'Қате', warning: 'Ескерту' };
const actionLabel = { create: 'Құру', update: 'Жаңарту', skip: 'Өткізу', link: 'Байланыстыру', existing: 'Бар' };
const statusLabel = {
  validated: 'Тексерілді',
  validation_failed: 'Қате бар',
  completed: 'Аяқталды',
  completed_with_errors: 'Қатемен аяқталды'
};

const emptySummary = {
  total_rows: 0,
  valid_rows: 0,
  invalid_rows: 0,
  will_create: 0,
  will_update: 0,
  will_link: 0,
  will_skip: 0,
  errors: 0,
  warnings: 0
};

const UserImport = () => {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('students');
  const [file, setFile] = useState(null);
  const [options, setOptions] = useState({ update_existing: false, create_missing_classes: true });
  const [batch, setBatch] = useState(null);
  const [validation, setValidation] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!api.isLoggedIn() || !api.isAdmin()) {
      window.location.href = api.getLoginPath();
      return;
    }
    loadCategories();
    loadHistory();
  }, []);

  const summary = validation?.summary || emptySummary;
  const issues = validation?.issues || [];
  const previewRows = validation?.rows || [];
  const blockingErrors = summary.errors > 0;

  const loadCategories = async () => {
    const res = await api.userImport.categories();
    if (res.success) {
      setCategories(res.data || []);
      const first = (res.data || [])[0];
      if (first) {
        setCategory((current) => current || first.key);
        setOptions({
          update_existing: optionBool(first.options?.update_existing),
          create_missing_classes: first.options?.create_missing_classes !== false
        });
      }
    } else {
      showToast(res.message || 'Импорт санаттарын жүктеу мүмкін болмады', 'error');
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    const params = 'limit=10';
    const res = await api.userImport.history(params);
    if (res.success) setHistory(res.data || []);
    setHistoryLoading(false);
  };

  const changeCategory = (next) => {
    const definition = categories.find((item) => item.key === next);
    setCategory(next);
    setBatch(null);
    setValidation(null);
    setResult(null);
    setFile(null);
    if (definition) {
      setOptions({
        update_existing: optionBool(definition.options?.update_existing),
        create_missing_classes: definition.options?.create_missing_classes !== false
      });
    }
  };

  const downloadTemplate = async () => {
    const res = await api.userImport.downloadTemplate(category);
    if (!res.success) showToast(res.message || 'Үлгіні жүктеу мүмкін болмады', 'error');
  };

  const uploadFile = async () => {
    if (!file) {
      showToast('Excel файлын таңдаңыз', 'error');
      return;
    }
    setLoading(true);
    setResult(null);
    const fd = new FormData();
    fd.append('category', category);
    fd.append('file', file);
    fd.append('update_existing', String(options.update_existing));
    fd.append('create_missing_classes', String(options.create_missing_classes));
    const res = await api.userImport.upload(fd);
    if (res.success) {
      setBatch(res.data.batch);
      setValidation(res.data.validation);
      showToast('Файл оқылды және тексерілді', 'success');
      loadHistory();
    } else {
      showToast(res.message || 'Файлды өңдеу мүмкін болмады', 'error');
    }
    setLoading(false);
  };

  const validateBatch = async () => {
    if (!batch?.id) return;
    setLoading(true);
    const res = await api.userImport.validate({ batch_id: batch.id, options });
    if (res.success) {
      setBatch(res.data.batch);
      setValidation(res.data.validation);
      showToast('Валидация жаңартылды', 'success');
      loadHistory();
    } else {
      showToast(res.message || 'Валидация қатесі', 'error');
    }
    setLoading(false);
  };

  const confirmImport = async () => {
    if (!batch?.id) return;
    if (!window.confirm('Импортты растағыңыз келе ме? Валидті жолдар базаға жазылады.')) return;
    setLoading(true);
    const res = await api.userImport.confirm({ batch_id: batch.id, options });
    if (res.success) {
      setBatch(res.data.batch);
      setResult(res.data);
      showToast('Импорт аяқталды', 'success');
      loadHistory();
    } else {
      showToast(res.message || 'Импортты сақтау мүмкін болмады', 'error');
    }
    setLoading(false);
  };

  const openHistoryItem = async (id) => {
    setLoading(true);
    const res = await api.userImport.details(id);
    if (res.success) {
      setBatch(res.data.batch);
      setValidation(res.data.validation);
      setResult(res.data.result?.rows ? {
        summary: {
          created: res.data.batch.created_count,
          updated: res.data.batch.updated_count,
          skipped: res.data.batch.skipped_count,
          errors: res.data.batch.error_count,
          total_rows: res.data.batch.total_rows
        },
        result_rows: res.data.result.rows,
        temporary_credentials: []
      } : null);
      setCategory(res.data.batch.category);
    } else {
      showToast(res.message || 'Импорт тарихын ашу мүмкін болмады', 'error');
    }
    setLoading(false);
  };

  const renderSummaryValue = (label, value, tone) => (
    <div className={`dash-stat-card ${tone}`} style={{ minHeight: 118 }}>
      <div className="dash-stat-num">{value}</div>
      <div className="dash-stat-label">{label}</div>
    </div>
  );

  return (
    <AdminShell>
      <div className="admin-page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="ap-page-title" style={{ marginBottom: 4 }}>Пайдаланушылар импорты</h1>
          <p className="ap-page-sub">Excel үлгілері арқылы оқушыларды, қызметкерлерді және ата-аналарды жүктеу</p>
        </div>
        <button className="btn btn-primary" onClick={downloadTemplate}>
          <i className="fas fa-file-excel"></i> Үлгіні жүктеу
        </button>
      </div>

      <div className="data-table-card" style={{ marginBottom: 24 }}>
        <div className="data-table-header">
          <h3><i className="fas fa-layer-group" style={{ color: 'var(--primary)' }}></i> Импорт түрі және параметрлер</h3>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 18 }}>
            {categories.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => changeCategory(item.key)}
                style={{
                  textAlign: 'left',
                  border: item.key === category ? '1px solid #38bdf8' : '1px solid var(--ap-border)',
                  background: item.key === category ? 'rgba(56,189,248,0.12)' : 'rgba(15,23,42,0.55)',
                  borderRadius: 8,
                  padding: 14,
                  color: '#e5e7eb',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.35 }}>{item.description}</div>
              </button>
            ))}
          </div>

          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="ap-form-label">Excel файлы</label>
              <label
                htmlFor="userImportFile"
                style={{
                  display: 'flex',
                  minHeight: 132,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 10,
                  border: '1px dashed #475569',
                  borderRadius: 8,
                  background: 'rgba(15,23,42,0.45)',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  padding: 18
                }}
              >
                <i className="fas fa-cloud-arrow-up" style={{ fontSize: 28, color: '#38bdf8' }}></i>
                <strong>{file ? file.name : 'Файлды таңдаңыз немесе осы жерге жүктеңіз'}</strong>
                <span style={{ color: '#94a3b8', fontSize: 13 }}>Тек .xlsx, бірінші парақ және бекітілген баған атаулары оқылады</span>
              </label>
              <input id="userImportFile" type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} hidden />
            </div>
            <div className="form-group">
              <label className="ap-form-label">Қайталанатын ЖСН</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#cbd5e1', marginTop: 10 }}>
                <input
                  type="checkbox"
                  checked={options.update_existing}
                  onChange={(e) => setOptions({ ...options, update_existing: e.target.checked })}
                />
                Бар пайдаланушыларды жаңарту
              </label>
            </div>
            {category === 'students' && (
              <div className="form-group">
                <label className="ap-form-label">Сыныптар</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#cbd5e1', marginTop: 10 }}>
                  <input
                    type="checkbox"
                    checked={options.create_missing_classes}
                    onChange={(e) => setOptions({ ...options, create_missing_classes: e.target.checked })}
                  />
                  Жоқ сыныптарды автоматты құру
                </label>
              </div>
            )}
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={uploadFile} disabled={loading}>
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i> Файлды оқу
            </button>
            <button className="btn btn-secondary" onClick={validateBatch} disabled={loading || !batch?.id}>
              <i className="fas fa-check-circle"></i> Қайта тексеру
            </button>
            <button className="btn btn-primary" onClick={confirmImport} disabled={loading || !batch?.id || previewRows.length === 0}>
              <i className="fas fa-database"></i> Импортты растау
            </button>
          </div>
        </div>
      </div>

      {validation && (
        <>
          <div className="dashboard-stat-grid" style={{ marginBottom: 24 }}>
            {renderSummaryValue('Барлық жол', summary.total_rows, 'blue')}
            {renderSummaryValue('Валидті', summary.valid_rows, 'green')}
            {renderSummaryValue('Қате жол', summary.invalid_rows, 'red')}
            {renderSummaryValue('Ескерту', summary.warnings, 'amber')}
          </div>

          <div className="data-table-card" style={{ marginBottom: 24 }}>
            <div className="data-table-header">
              <h3><i className="fas fa-triangle-exclamation" style={{ color: blockingErrors ? '#ef4444' : '#f59e0b' }}></i> Валидация нәтижесі</h3>
              <span className={`badge ${blockingErrors ? 'badge-red' : 'badge-green'}`}>
                {blockingErrors ? `${summary.errors} қате` : 'Импортқа дайын'}
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Жол</th>
                    <th>Деңгей</th>
                    <th>Өріс</th>
                    <th>Хабарлама</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.length ? issues.slice(0, 80).map((issue, index) => (
                    <tr key={`${issue.row_number || 'batch'}-${index}`}>
                      <td>{issue.row_number || 'Файл'}</td>
                      <td>
                        <span className={`badge ${issue.severity === 'error' ? 'badge-red' : 'badge-amber'}`}>
                          {severityLabel[issue.severity] || issue.severity}
                        </span>
                      </td>
                      <td>{issue.field || '—'}</td>
                      <td>{issue.message}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4"><div className="empty-state"><i className="fas fa-check"></i><h3>Қате жоқ</h3></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="data-table-card" style={{ marginBottom: 24 }}>
            <div className="data-table-header">
              <h3><i className="fas fa-table" style={{ color: 'var(--primary)' }}></i> Алдын ала қарау</h3>
              <span style={{ color: 'var(--text-muted)' }}>Алғашқы 25 жол</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Жол</th>
                    <th>ЖСН</th>
                    <th>Аты-жөні</th>
                    <th>Рөл</th>
                    <th>Әрекет</th>
                    <th>Сынып / байланыс</th>
                    <th>Күйі</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 25).map((row) => (
                    <tr key={row.row_number}>
                      <td>{row.row_number}</td>
                      <td className="td-iin">{row.normalized?.iin || '—'}</td>
                      <td className="td-name">{row.normalized?.full_name || '—'}</td>
                      <td>{row.normalized?.role?.name || row.normalized?.requested_role || '—'}</td>
                      <td>{actionLabel[row.action] || row.action}</td>
                      <td>{row.class_name || row.linked_student_name || row.normalized?.linked_student_iin || '—'}</td>
                      <td>
                        {row.valid ? (
                          <span className="badge badge-green">Жарамды</span>
                        ) : (
                          <span className="badge badge-red">{row.errors?.length || 0} қате</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {result && (
        <div className="data-table-card" style={{ marginBottom: 24 }}>
          <div className="data-table-header">
            <h3><i className="fas fa-clipboard-check" style={{ color: '#22c55e' }}></i> Импорт қорытындысы</h3>
          </div>
          <div style={{ padding: 20 }}>
            <div className="dashboard-stat-grid" style={{ marginBottom: 18 }}>
              {renderSummaryValue('Құрылды', result.summary?.created || 0, 'green')}
              {renderSummaryValue('Жаңартылды', result.summary?.updated || 0, 'blue')}
              {renderSummaryValue('Өткізілді', result.summary?.skipped || 0, 'amber')}
              {renderSummaryValue('Қате', result.summary?.errors || 0, 'red')}
            </div>
            {result.temporary_credentials?.length > 0 && (
              <>
                <p style={{ color: '#fbbf24', marginBottom: 12 }}>
                  Уақытша парольдер тек осы сәтте көрсетіледі және базаға ашық түрде сақталмайды.
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Жол</th>
                        <th>ЖСН</th>
                        <th>Рөл</th>
                        <th>Уақытша пароль</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.temporary_credentials.slice(0, 50).map((item) => (
                        <tr key={`${item.row_number}-${item.iin}`}>
                          <td>{item.row_number}</td>
                          <td>{item.iin}</td>
                          <td>{item.role}</td>
                          <td className="td-iin">{item.temporary_password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="data-table-card">
        <div className="data-table-header">
          <h3><i className="fas fa-history" style={{ color: 'var(--primary)' }}></i> Импорт тарихы</h3>
          <button className="btn btn-secondary btn-sm" onClick={loadHistory}>Жаңарту</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Санат</th>
                <th>Файл</th>
                <th>Статус</th>
                <th>Нәтиже</th>
                <th>Уақыты</th>
                <th>Әрекет</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr><td colSpan="7"><i className="fas fa-spinner fa-spin"></i></td></tr>
              ) : history.length ? history.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td>{item.category}</td>
                  <td>{item.original_filename || '—'}</td>
                  <td><span className="badge badge-blue">{statusLabel[item.status] || item.status}</span></td>
                  <td>
                    {item.created_count || 0} / {item.updated_count || 0} / {item.skipped_count || 0} / {item.error_count || 0}
                  </td>
                  <td>{formatDateTime(item.created_at)}</td>
                  <td>
                    <button className="ap-btn-view" onClick={() => openHistoryItem(item.id)}>КӨРУ</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="7"><div className="empty-state"><i className="fas fa-clock"></i><h3>Импорт тарихы бос</h3></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
};

export default UserImport;
