/**
 * Role-Based Access Control middleware
 */

/**
 * Require user to have one of the specified roles
 * Must be used after authenticate middleware
 * @param  {...string} roles - e.g. requireRole('admin'), requireRole('admin', 'teacher')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Авторизация талап етіледі' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Бұл әрекет үшін рұқсат жоқ. Қажетті роль: ${roles.join(' немесе ')}`
      });
    }

    next();
  };
};

/**
 * Require school admin or super admin role
 */
const requireAdmin = requireRole('admin', 'super_admin');

/**
 * Require only super admin role
 */
const requireSuperAdmin = requireRole('super_admin');

/**
 * Require teacher role or admin / super admin
 */
const requireTeacher = requireRole('teacher', 'admin', 'super_admin');
const studentWorkRoles = [
  'teacher',
  'admin',
  'super_admin',
  'director',
  'deputy_education',
  'deputy_culture',
  'deputy_profile',
  'career_counselor',
  'psychologist',
  'organizer_teacher',
  'assistant_teacher',
  'mentor',
  'club_leader',
  'extracurricular_teacher',
  'sport_instructor',
  'labor_instructor',
  'admin_staff',
  'deputy_academic',
  'organizer',
  'assistant',
  'tutor',
  'extra_education',
  'pe_instructor'
];
const requireStudentWorkAccess = requireRole(...studentWorkRoles);
const requireLibrary = requireRole('librarian', 'teacher', 'admin', 'super_admin');
const requireNurse = requireRole('nurse', 'admin', 'super_admin');
const requirePsychologist = requireRole('psychologist', 'admin', 'super_admin');
const requireLabAssistant = requireRole('lab_assistant', 'teacher', 'admin', 'super_admin');
const requireAssistantTeacher = requireRole('assistant_teacher', 'teacher', 'admin', 'super_admin');

module.exports = {
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireTeacher,
  requireStudentWorkAccess,
  requireLibrary,
  requireNurse,
  requirePsychologist,
  requireLabAssistant,
  requireAssistantTeacher
};
