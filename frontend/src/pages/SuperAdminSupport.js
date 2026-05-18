import React, { useEffect, useState } from 'react';
import SuperAdminShell from '../components/SuperAdminShell.js';
import api, { showToast } from '../utils/api.js';
import { formatDateTime } from '../utils/api.js';

export default function SuperAdminSupport() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    const res = await api.notifications.list();
    if (res.success) {
      setNotifications(res.data || []);
    } else {
      showToast(res.message || 'Хабарламалар жүктелмеді', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markRead = async (id) => {
    const res = await api.notifications.read(id);
    if (res.success) {
      setNotifications((prev) => prev.map((item) => (item.id === id ? res.data : item)));
      showToast('Хабарлама оқылды', 'success');
    } else {
      showToast(res.message || 'Қателік', 'error');
    }
  };

  return (
    <SuperAdminShell>
      <div className="ap-page-head">
        <div>
          <h1 className="ap-page-title">Техникалық қолдау</h1>
          <p className="ap-page-sub">Жүйелік хабарламалар мен қолдау хабарларын тексеру</p>
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
                  <th>Уақыт</th>
                  <th>Пайдаланушы</th>
                  <th>Мектеп</th>
                  <th>Түрі</th>
                  <th>Хабарлама</th>
                  <th>Статус</th>
                  <th>Әрекет</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((note) => (
                  <tr key={note.id} style={{ opacity: note.is_read ? 0.65 : 1 }}>
                    <td>{formatDateTime(note.created_at)}</td>
                    <td>{note.user_id || '—'}</td>
                    <td>{note.school_id || '—'}</td>
                    <td>{note.type || '—'}</td>
                    <td>{note.content}</td>
                    <td>{note.is_read ? 'Оқылды' : 'Оқылмаған'}</td>
                    <td>
                      {!note.is_read && (
                        <button className="btn btn-small" onClick={() => markRead(note.id)}>
                          Оқылды
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {notifications.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center' }}>
                      Хабарламалар табылмады
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
