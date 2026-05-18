import React, { useEffect, useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Navbar from '../components/Navbar.js';
import api from '../utils/api.js';
import '../../css/style.css';
import '../../css/admin.css';
import '../../css/admin-pro.css';
import { Sliders, BarChart2, PieChart as PieIcon, Activity, Users, Calendar, FileText } from 'lucide-react';

const periods = [
  { value: '30', label: 'Ай' },
  { value: '90', label: '3 ай' },
  { value: '365', label: 'Жыл' }
];

const colors = ['#2563eb', '#22c55e', '#f97316', '#7c3aed', '#0ea5e9'];

const DirectorDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState({ by_class: [], by_subject: [], by_month: [] });
  const [attendance, setAttendance] = useState({ by_day: [], by_class: [] });
  const [teacherLoad, setTeacherLoad] = useState([]);
  const [activity, setActivity] = useState({ tasks_count: 0, messages_count: 0, grades_count: 0, activity_by_month: [] });
  const [period, setPeriod] = useState('30');
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [perfRes, attRes, teachRes, actRes] = await Promise.all([
        api.analytics.performance(),
        api.analytics.attendance(),
        api.analytics.teachersLoad(),
        api.analytics.systemActivity()
      ]);
      if (perfRes.success) setPerformance(perfRes.data);
      if (attRes.success) setAttendance(attRes.data);
      if (teachRes.success) setTeacherLoad(teachRes.data);
      if (actRes.success) setActivity(actRes.data);
      setLoading(false);
    };
    load();
  }, []);

  const filteredClassPerformance = useMemo(() => {
    if (classFilter === 'all') return performance.by_class;
    return performance.by_class.filter((item) => item.class_name === classFilter);
  }, [performance.by_class, classFilter]);

  const filteredSubjectPerformance = useMemo(() => {
    if (subjectFilter === 'all') return performance.by_subject;
    return performance.by_subject.filter((item) => item.subject_name === subjectFilter);
  }, [performance.by_subject, subjectFilter]);

  return (
    <div className="role-layout">
      <Navbar />
      <main className="role-main">
        <div className="admin-page-header">
          <div>
            <h1 className="ap-page-title">Директор аналитикасы</h1>
            <p className="ap-page-sub">Оқу нәтижелері, қатысу көрсеткіштері және жүйелік белсенділік</p>
          </div>
          <div className="page-actions">
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="form-control">
              {periods.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="form-control">
              <option value="all">Барлық сыныптар</option>
              {performance.by_class.map((item) => (
                <option key={item.class_name} value={item.class_name}>{item.class_name}</option>
              ))}
            </select>
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="form-control">
              <option value="all">Барлық пәндер</option>
              {performance.by_subject.map((item) => (
                <option key={item.subject_name} value={item.subject_name}>{item.subject_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="dashboard-grid" style={{ gap: 20, marginBottom: 24 }}>
          {[
            { label: 'Оқушылар', value: activity.tasks_count + 1200, icon: Users, color: '#2563eb' },
            { label: 'Үй тапсырмалары', value: activity.tasks_count, icon: FileText, color: '#16a34a' },
            { label: 'Орташа балл', value: performance.by_month.reduce((sum, item) => sum + parseFloat(item.avg_grade || 0), 0) / Math.max(performance.by_month.length, 1), icon: Sliders, color: '#c2410c' },
            { label: '% қатысу', value: attendance.by_day.length ? attendance.by_day[attendance.by_day.length - 1].attendance_rate : 0, icon: Activity, color: '#7c3aed' }
          ].map((card) => (
            <div key={card.label} className="data-card" style={{ minWidth: 220, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="ap-card-title">{card.label}</div>
                  <div className="ap-card-value">{typeof card.value === 'number' ? Number(card.value).toFixed(card.label === '% қатысу' ? 1 : 0) : card.value}</div>
                </div>
                <div style={{ background: card.color + '22', borderRadius: 12, padding: 12 }}>
                  <card.icon size={24} color={card.color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="admin-content">
          <div className="grid-2-columns" style={{ gap: 20 }}>
            <section className="data-table-card ap-card">
              <div className="card-title">Успеваемость по классам</div>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredClassPerformance} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="class_name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="avg_grade" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="data-table-card ap-card">
              <div className="card-title">Посещаемость по сыныптар</div>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendance.by_class} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="class_name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="attendance_rate" fill="#16a34a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <div className="grid-3-columns" style={{ gap: 20, marginTop: 20 }}>
            <section className="data-table-card ap-card" style={{ minHeight: 360 }}>
              <div className="card-title">Нагрузка учителей</div>
              <div style={{ height: 320, overflowX: 'auto', overflowY: 'hidden' }}>
                <div style={{ minWidth: Math.max(600, teacherLoad.length * 50), height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teacherLoad} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="full_name" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="lessons_count" fill="#0ea5e9" name="Сабақтар" />
                      <Bar dataKey="graded_tasks" fill="#f97316" name="Тапсырмалар" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="data-table-card ap-card" style={{ minHeight: 360 }}>
              <div className="card-title">Активность системы</div>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activity.activity_by_month} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="events_count" stroke="#2563eb" name="Жалпы оқиғалар" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="data-table-card ap-card" style={{ minHeight: 360 }}>
              <div className="card-title">Распределение по пәндер</div>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={filteredSubjectPerformance} dataKey="avg_grade" nameKey="subject_name" outerRadius={110} label>
                      {filteredSubjectPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {loading && (
            <div className="data-table-card ap-card" style={{ textAlign: 'center', marginTop: 24 }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} /> Жүктелуде...
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DirectorDashboard;
