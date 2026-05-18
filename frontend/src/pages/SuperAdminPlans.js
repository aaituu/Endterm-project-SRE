import React, { useEffect, useState } from 'react';
import SuperAdminShell from '../components/SuperAdminShell.js';
import api, { showToast } from '../utils/api.js';

export default function SuperAdminPlans() {
  const [plans, setPlans] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [planRes, assignmentRes] = await Promise.all([api.superAdmin.plans.list(), api.superAdmin.plans.assignments()]);
    if (planRes.success) setPlans(planRes.data || []);
    else showToast(planRes.message || 'Пландар жүктелмеді', 'error');
    if (assignmentRes.success) setAssignments(assignmentRes.data || []);
    else showToast(assignmentRes.message || 'Назначения жүктелмеді', 'error');
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SuperAdminShell>
      <div className="ap-page-head">
        <div>
          <h1 className="ap-page-title">Жоспарлар</h1>
          <p className="ap-page-sub">Жүйелік SaaS жоспарлар мен мектептерге тағайындаулар</p>
        </div>
      </div>

      {loading ? (
        <p>Жүктелуде...</p>
      ) : (
        <>
          <div className="data-card" style={{ marginBottom: 20 }}>
            <h3>Белгілі жоспарлар</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Атауы</th>
                    <th>Бағасы</th>
                    <th>Құрылғылар</th>
                    <th>Белсенді</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td>{plan.name}</td>
                      <td>{plan.price_per_month || 0} тг / ай</td>
                      <td>{plan.limits ? JSON.stringify(plan.limits) : '—'}</td>
                      <td>{plan.is_active ? 'Иә' : 'Жоқ'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="data-card">
            <h3>Мектептерге жоспар тағайындаулар</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Мектеп</th>
                    <th>Жоспар</th>
                    <th>Статус</th>
                    <th>Бастау</th>
                    <th>Аяқталу</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>{assignment.school_name}</td>
                      <td>{assignment.plan_name}</td>
                      <td>{assignment.status}</td>
                      <td>{assignment.start_date || '—'}</td>
                      <td>{assignment.end_date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </SuperAdminShell>
  );
}
