const routes = [
  { prefix: '/api/auth', targetEnv: 'AUTH_SERVICE_URL', target: 'http://auth-service:3001' },
  { prefix: '/api/users', targetEnv: 'USER_SERVICE_URL', target: 'http://user-service:3002' },
  { prefix: '/api/roles', targetEnv: 'USER_SERVICE_URL', target: 'http://user-service:3002' },
  { prefix: '/api/user-import', targetEnv: 'USER_SERVICE_URL', target: 'http://user-service:3002' },
  { prefix: '/api/teachers', targetEnv: 'USER_SERVICE_URL', target: 'http://user-service:3002' },
  { prefix: '/api/students', targetEnv: 'USER_SERVICE_URL', target: 'http://user-service:3002' },
  { prefix: '/api/student-reports', targetEnv: 'USER_SERVICE_URL', target: 'http://user-service:3002' },
  { prefix: '/api/student-profiles', targetEnv: 'USER_SERVICE_URL', target: 'http://user-service:3002' },
  { prefix: '/api/student-achievements', targetEnv: 'USER_SERVICE_URL', target: 'http://user-service:3002' },

  { prefix: '/api/school-context', targetEnv: 'SCHOOL_SERVICE_URL', target: 'http://school-service:3003' },
  { prefix: '/api/super-admin', targetEnv: 'SCHOOL_SERVICE_URL', target: 'http://school-service:3003' },

  { prefix: '/api/academic', targetEnv: 'ACADEMIC_SERVICE_URL', target: 'http://academic-service:3004' },
  { prefix: '/api/attendance', targetEnv: 'ACADEMIC_SERVICE_URL', target: 'http://academic-service:3004' },
  { prefix: '/api/lesson-observations', targetEnv: 'ACADEMIC_SERVICE_URL', target: 'http://academic-service:3004' },
  { prefix: '/api/lesson-visits', targetEnv: 'ACADEMIC_SERVICE_URL', target: 'http://academic-service:3004' },
  { prefix: '/api/attestations', targetEnv: 'ACADEMIC_SERVICE_URL', target: 'http://academic-service:3004' },
  { prefix: '/api/medical', targetEnv: 'ACADEMIC_SERVICE_URL', target: 'http://academic-service:3004' },

  { prefix: '/api/assignments', targetEnv: 'ASSIGNMENT_SERVICE_URL', target: 'http://assignment-service:3005' },
  { prefix: '/api/tasks', targetEnv: 'ASSIGNMENT_SERVICE_URL', target: 'http://assignment-service:3005' },
  { prefix: '/api/monthly-plans', targetEnv: 'ASSIGNMENT_SERVICE_URL', target: 'http://assignment-service:3005' },
  { prefix: '/api/teacher/dashboard', targetEnv: 'ASSIGNMENT_SERVICE_URL', target: 'http://assignment-service:3005' },
  { prefix: '/api/teacher-materials', targetEnv: 'ASSIGNMENT_SERVICE_URL', target: 'http://assignment-service:3005' },
  { prefix: '/api/teacher-courses', targetEnv: 'ASSIGNMENT_SERVICE_URL', target: 'http://assignment-service:3005' },
  { prefix: '/api/teacher-qmg', targetEnv: 'ASSIGNMENT_SERVICE_URL', target: 'http://assignment-service:3005' },
  { prefix: '/api/messages', targetEnv: 'ASSIGNMENT_SERVICE_URL', target: 'http://assignment-service:3005' },

  { prefix: '/api/slides', targetEnv: 'CONTENT_SERVICE_URL', target: 'http://content-service:3006' },
  { prefix: '/api/news', targetEnv: 'CONTENT_SERVICE_URL', target: 'http://content-service:3006' },
  { prefix: '/api/gallery', targetEnv: 'CONTENT_SERVICE_URL', target: 'http://content-service:3006' },
  { prefix: '/api/administration', targetEnv: 'CONTENT_SERVICE_URL', target: 'http://content-service:3006' },
  { prefix: '/api/contact', targetEnv: 'CONTENT_SERVICE_URL', target: 'http://content-service:3006' },
  { prefix: '/api/site-content', targetEnv: 'CONTENT_SERVICE_URL', target: 'http://content-service:3006' },
  { prefix: '/api/events', targetEnv: 'CONTENT_SERVICE_URL', target: 'http://content-service:3006' },
  { prefix: '/api/event-types', targetEnv: 'CONTENT_SERVICE_URL', target: 'http://content-service:3006' },
  { prefix: '/api/library', targetEnv: 'CONTENT_SERVICE_URL', target: 'http://content-service:3006' },

  { prefix: '/api/stats', targetEnv: 'ANALYTICS_SERVICE_URL', target: 'http://analytics-service:3007' },
  { prefix: '/api/analytics', targetEnv: 'ANALYTICS_SERVICE_URL', target: 'http://analytics-service:3007' },
  { prefix: '/api/reports', targetEnv: 'ANALYTICS_SERVICE_URL', target: 'http://analytics-service:3007' },
  { prefix: '/api/ratings', targetEnv: 'ANALYTICS_SERVICE_URL', target: 'http://analytics-service:3007' },
  { prefix: '/api/rating-types', targetEnv: 'ANALYTICS_SERVICE_URL', target: 'http://analytics-service:3007' },
  { prefix: '/api/competition-dictionaries', targetEnv: 'ANALYTICS_SERVICE_URL', target: 'http://analytics-service:3007' },
  { prefix: '/api/competition-names', targetEnv: 'ANALYTICS_SERVICE_URL', target: 'http://analytics-service:3007' },
  { prefix: '/api/olympiads', targetEnv: 'ANALYTICS_SERVICE_URL', target: 'http://analytics-service:3007' },

  { prefix: '/api/notifications', targetEnv: 'NOTIFICATION_SERVICE_URL', target: 'http://notification-service:3008' },
  { prefix: '/api/telegram', targetEnv: 'NOTIFICATION_SERVICE_URL', target: 'http://notification-service:3008' }
];

module.exports = routes.sort((a, b) => b.prefix.length - a.prefix.length);
