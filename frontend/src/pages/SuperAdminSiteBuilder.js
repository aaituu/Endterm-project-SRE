import React, { useEffect, useState } from 'react';
import SuperAdminShell from '../components/SuperAdminShell.js';
import api, { showToast } from '../utils/api.js';

const jsonOrEmpty = (value) => {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return '{}';
  }
};

export default function SuperAdminSiteBuilder() {
  const [templates, setTemplates] = useState([]);
  const [styles, setStyles] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [templatesRes, stylesRes, componentsRes] = await Promise.all([
        api.superAdmin.siteBuilder.templates(),
        api.superAdmin.siteBuilder.styles(),
        api.superAdmin.siteBuilder.components()
      ]);
      if (templatesRes.success) setTemplates(templatesRes.data || []);
      else showToast(templatesRes.message || 'Шаблондар жүктелмеді', 'error');
      if (stylesRes.success) setStyles(stylesRes.data || []);
      else showToast(stylesRes.message || 'Стильдер жүктелмеді', 'error');
      if (componentsRes.success) setComponents(componentsRes.data || []);
      else showToast(componentsRes.message || 'Компоненттер жүктелмеді', 'error');
      setLoading(false);
    };
    load();
  }, []);

  const renderTable = (title, description, rows, thirdColumnLabel) => (
    <div className="data-card site-builder-card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <h3 style={{ marginBottom: 6 }}>{title}</h3>
          <p className="ap-page-sub" style={{ margin: 0 }}>{description}</p>
        </div>
        <span className="badge badge-blue">{rows.length}</span>
      </div>
      <div className="table-wrap site-builder-table">
        <table>
          <thead>
            <tr>
              <th>Аты</th>
              <th>Slug</th>
              <th>{thirdColumnLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.slug}</td>
                <td><pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>{jsonOrEmpty(item.config)}</pre></td>
              </tr>
            )) : (
              <tr>
                <td colSpan="3" style={{ padding: '22px 28px', color: '#94a3b8' }}>
                  Әзірге жазба жоқ. Бұл бөлім болашақта мектеп сайттарының ортақ шаблондарын, түстерін және компонент баптауларын сақтайды.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <SuperAdminShell>
      <div className="ap-page-head">
        <div>
          <h1 className="ap-page-title">Сайт құралы</h1>
          <p className="ap-page-sub">Глобалдық шаблондар, стильдер мен компонент конфигурацияларын басқару</p>
        </div>
      </div>

      {loading ? (
        <p>Жүктелуде...</p>
      ) : (
        <>
          {renderTable('Сайт шаблондары', 'Мектеп сайттарына ортақ layout/template preset-тері.', templates, 'Конфигурация')}
          {renderTable('Глобал стильдер', 'Түстер, қаріптер және ортақ визуал баптаулар.', styles, 'Конфигурация')}
          {renderTable('Компонент конфигурациясы', 'Hero, жаңалықтар, галерея сияқты блоктардың default баптаулары.', components, 'Конфигурация')}
        </>
      )}
    </SuperAdminShell>
  );
}
