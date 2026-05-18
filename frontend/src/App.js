import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import api from './utils/api.js';
import Home from './pages/Home.js';
import Login from './pages/Login.js';
import TeacherDashboard from './pages/TeacherDashboard.js';
import DirectorDashboard from './pages/DirectorDashboard.js';
import Profile from './pages/Profile.js';
import {
  Dashboard,
  Users,
  UserImport,
  Roles,
  Academic,
  AcademicClasses,
  AcademicSubjects,
  AcademicSubjectEdit,
  AcademicClassrooms,
  AcademicClassroomEdit,
  AcademicSchedule,
  AcademicScheduleClass,
  AcademicClassEdit,
  Tasks,
  TasksArchive,
  TaskForm,
  LibraryBooks,
  LibraryReservations,
  Attendance,
  Reports,
  ReportDetail,
  ReportTeacherStatus,
  Students,
  StudentProfileForm,
  Achievements,
  AchievementForm,
  AchievementDetail,
  Olympiads,
  Events,
  Attestations,
  AttestationTypes,
  Stats,
  Rating,
  Slides,
  News as AdminNews,
  Gallery as AdminGallery,
  Teachers as AdminTeachers,
  CompetitionApplications,
  CompetitionApplicationForm,
  CompetitionTypes,
  CompetitionTypeForm,
  CompetitionLevels,
  CompetitionLevelForm,
  EventForm,
  EventDetail,
  EventTypes,
  EventTypeForm,
  CompetitionNames,
  CompetitionNameForm,
  Ratings,
  RatingForm,
  RatingTypes,
  RatingTypeForm,
  LessonObservations,
  LessonObservationForm,
  SiteContentAbout,
  SiteContentHistory,
  SiteContentPrograms,
  SiteContentContacts,
  SiteAdministration
} from './admin/index.js';
import Administration from './pages/Administration.js';
import Contact from './pages/Contact.js';
import SuperAdminDashboard from './pages/SuperAdminDashboard.js';
import SuperAdminSchools from './pages/SuperAdminSchools.js';
import SuperAdminSchoolPanel from './pages/SuperAdminSchoolPanel.js';
import SuperAdminSiteBuilder from './pages/SuperAdminSiteBuilder.js';
import SuperAdminAnalytics from './pages/SuperAdminAnalytics.js';
import SuperAdminLogs from './pages/SuperAdminLogs.js';
import SuperAdminPlans from './pages/SuperAdminPlans.js';
import SuperAdminSupport from './pages/SuperAdminSupport.js';
import Gallery from './pages/Gallery.js';
import News from './pages/News.js';
import NewsDetail from './pages/NewsDetail.js';
import Teachers from './pages/Teachers.js';
import TeacherDetail from './pages/TeacherDetail.js';
import RoleCabinet from './pages/RoleCabinet.js';

function App() {
  const isSchoolHost = Boolean(api.getHostTenantSlug());

  if (!isSchoolHost) {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/schools" element={<SuperAdminSchools />} />
          <Route path="/super-admin/schools/:id" element={<SuperAdminSchoolPanel />} />
          <Route path="/super-admin/site-builder" element={<SuperAdminSiteBuilder />} />
          <Route path="/super-admin/analytics" element={<SuperAdminAnalytics />} />
          <Route path="/super-admin/support" element={<SuperAdminSupport />} />
          <Route path="/super-admin/logs" element={<SuperAdminLogs />} />
          <Route path="/super-admin/plans" element={<SuperAdminPlans />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={isSchoolHost ? <Home /> : <Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
        <Route path="/student-dashboard" element={<RoleCabinet role="student" />} />
        <Route path="/parent-dashboard" element={<RoleCabinet role="parent" />} />
        <Route path="/librarian-dashboard" element={<RoleCabinet role="librarian" />} />
        <Route path="/staff-dashboard" element={<RoleCabinet role="staff" />} />
        <Route path="/director-dashboard" element={<DirectorDashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/schools" element={<SuperAdminSchools />} />
        <Route path="/super-admin/schools/:id" element={<SuperAdminSchoolPanel />} />
        <Route path="/super-admin/site-builder" element={<SuperAdminSiteBuilder />} />
        <Route path="/super-admin/analytics" element={<SuperAdminAnalytics />} />
        <Route path="/super-admin/support" element={<SuperAdminSupport />} />
        <Route path="/super-admin/logs" element={<SuperAdminLogs />} />
        <Route path="/super-admin/plans" element={<SuperAdminPlans />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/user-import" element={<UserImport />} />
        <Route path="/admin/roles" element={<Roles />} />
        <Route path="/admin/academic" element={<Academic />} />
        <Route path="/admin/academic/classes" element={<AcademicClasses />} />
        <Route path="/admin/academic/subjects" element={<AcademicSubjects />} />
        <Route path="/admin/academic/subjects/:id" element={<AcademicSubjectEdit />} />
        <Route path="/admin/academic/classrooms" element={<AcademicClassrooms />} />
        <Route path="/admin/academic/classrooms/:id" element={<AcademicClassroomEdit />} />
        <Route path="/admin/academic/schedule" element={<AcademicSchedule />} />
        <Route path="/admin/academic/schedule/:classId" element={<AcademicScheduleClass />} />
        <Route path="/admin/academic/classes/:id/edit" element={<AcademicClassEdit />} />
        <Route path="/admin/tasks" element={<Tasks />} />
        <Route path="/admin/tasks/archive" element={<TasksArchive />} />
        <Route path="/admin/tasks/new" element={<TaskForm />} />
        <Route path="/admin/tasks/:id/edit" element={<TaskForm />} />
        <Route path="/admin/library" element={<LibraryBooks />} />
        <Route path="/admin/library/reservations" element={<LibraryReservations />} />
        <Route path="/admin/attendance" element={<Attendance />} />
        <Route path="/admin/reports/status" element={<ReportTeacherStatus />} />
        <Route path="/admin/reports/:id" element={<ReportDetail />} />
        <Route path="/admin/reports" element={<Reports />} />
        <Route path="/admin/students/new" element={<StudentProfileForm />} />
        <Route path="/admin/students/:id/edit" element={<StudentProfileForm />} />
        <Route path="/admin/students" element={<Students />} />
        <Route path="/admin/achievements/new" element={<AchievementForm />} />
        <Route path="/admin/achievements/:id/edit" element={<AchievementForm />} />
        <Route path="/admin/achievements/:id" element={<AchievementDetail />} />
        <Route path="/admin/achievements" element={<Achievements />} />
        <Route path="/admin/olympiads/applications/new" element={<CompetitionApplicationForm />} />
        <Route path="/admin/olympiads/applications" element={<CompetitionApplications />} />
        <Route path="/admin/olympiads/types/new" element={<CompetitionTypeForm />} />
        <Route path="/admin/olympiads/types/:id/edit" element={<CompetitionTypeForm />} />
        <Route path="/admin/olympiads/types" element={<CompetitionTypes />} />
        <Route path="/admin/olympiads/levels/new" element={<CompetitionLevelForm />} />
        <Route path="/admin/olympiads/levels/:id/edit" element={<CompetitionLevelForm />} />
        <Route path="/admin/olympiads/levels" element={<CompetitionLevels />} />
        <Route path="/admin/olympiads/names/new" element={<CompetitionNameForm />} />
        <Route path="/admin/olympiads/names/:id/edit" element={<CompetitionNameForm />} />
        <Route path="/admin/olympiads/names" element={<CompetitionNames />} />
        <Route path="/admin/olympiads" element={<Olympiads />} />
        <Route path="/admin/ratings/new" element={<RatingForm />} />
        <Route path="/admin/ratings/:id/edit" element={<RatingForm />} />
        <Route path="/admin/ratings" element={<Ratings />} />
        <Route path="/admin/rating-types/new" element={<RatingTypeForm />} />
        <Route path="/admin/rating-types/:id/edit" element={<RatingTypeForm />} />
        <Route path="/admin/rating-types" element={<RatingTypes />} />
        <Route path="/admin/lesson-observations" element={<LessonObservations />} />
        <Route path="/admin/lesson-observations/new" element={<LessonObservationForm />} />
        <Route path="/admin/events" element={<Events />} />
        <Route path="/admin/events/new" element={<EventForm />} />
        <Route path="/admin/events/:id/edit" element={<EventForm />} />
        <Route path="/admin/events/:id" element={<EventDetail />} />
        <Route path="/admin/event-types" element={<EventTypes />} />
        <Route path="/admin/event-types/new" element={<EventTypeForm />} />
        <Route path="/admin/event-types/:id/edit" element={<EventTypeForm />} />
        <Route path="/admin/attestations" element={<Attestations />} />
        <Route path="/admin/attestations/types" element={<AttestationTypes />} />
        <Route path="/admin/news" element={<AdminNews />} />
        <Route path="/admin/gallery" element={<AdminGallery />} />
        <Route path="/admin/teachers" element={<AdminTeachers />} />
        <Route path="/admin/stats" element={<Stats />} />
        <Route path="/admin/rating" element={<Rating />} />
        <Route path="/admin/slides" element={<Slides />} />
        <Route path="/admin/site/slides" element={<Slides />} />
        <Route path="/admin/site/about" element={<SiteContentAbout />} />
        <Route path="/admin/site/history" element={<SiteContentHistory />} />
        <Route path="/admin/site/programs" element={<SiteContentPrograms />} />
        <Route path="/admin/site/contacts" element={<SiteContentContacts />} />
        <Route path="/admin/site/administration" element={<SiteAdministration />} />
        <Route path="/administration" element={<Administration />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/news" element={<News />} />
        <Route path="/news-detail" element={<NewsDetail />} />
        <Route path="/teachers" element={<Teachers />} />
        <Route path="/teacher-detail" element={<TeacherDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
