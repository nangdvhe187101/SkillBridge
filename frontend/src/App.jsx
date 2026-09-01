import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AuthLayout from './components/AuthLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/customer/Home';
import Auth from './pages/auth/Auth';
import VerifyEmail from './pages/auth/VerifyEmail';
import Jobs from './pages/customer/Jobs';
import JobDetail from './pages/customer/JobDetail';
import MyWork from './pages/customer/MyWork';
import Profile from './pages/customer/Profile';
import CompanyProfile from './pages/customer/CompanyProfile';
import StudentProfile from './pages/customer/StudentProfile';
import Pricing from './pages/customer/Pricing';
import PostJob from './pages/employer/PostJob';
import Dashboard from './pages/employer/Dashboard';
import JobApplicants from './pages/employer/JobApplicants';
import Wallet from './pages/customer/Wallet';
import Admin from './pages/admin/Admin';
import Messages from './pages/customer/Messages';
import AccountSettings from './pages/customer/AccountSettings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/:mode" element={<Auth />} />
          <Route path="/login" element={<Auth forcedTab="login" />} />
          <Route path="/register" element={<Auth forcedTab="register" />} />
          <Route path="/forgot-password" element={<Auth forcedTab="forgot" />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Route>

        <Route element={<Layout />}>
          {/* Public & Customer Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/company/:slug" element={<CompanyProfile />} />
          <Route path="/u/:slug" element={<StudentProfile />} />
          <Route path="/pricing" element={<Pricing />} />

          {/* Student Role Routes */}
          <Route path="/mywork" element={
            <ProtectedRoute><MyWork /></ProtectedRoute>
          } />
          <Route path="/student/mywork" element={
            <ProtectedRoute><MyWork /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/student/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />

          {/* Employer Role Routes */}
          <Route path="/employer" element={
            <ProtectedRoute><Dashboard forcedTab="overview" /></ProtectedRoute>
          } />
          <Route path="/employer/dashboard" element={
            <ProtectedRoute><Dashboard forcedTab="overview" /></ProtectedRoute>
          } />
          <Route path="/employer/jobs" element={
            <ProtectedRoute><Dashboard forcedTab="jobs" /></ProtectedRoute>
          } />
          <Route path="/employer/post-job" element={
            <ProtectedRoute><Dashboard forcedTab="post" /></ProtectedRoute>
          } />
          <Route path="/employer/create-job" element={
            <ProtectedRoute><Dashboard forcedTab="post" /></ProtectedRoute>
          } />
          <Route path="/employer/ads" element={
            <ProtectedRoute><Dashboard forcedTab="ads" /></ProtectedRoute>
          } />
          <Route path="/employer/jobs/:jobId/edit" element={
            <ProtectedRoute><Dashboard forcedTab="edit" /></ProtectedRoute>
          } />
          <Route path="/employer/jobs/:jobId" element={
            <ProtectedRoute><JobApplicants /></ProtectedRoute>
          } />

          {/* Backward compatibility aliases */}
          <Route path="/post-job" element={<Navigate to="/employer/post-job" replace />} />
          <Route path="/dashboard" element={<Navigate to="/employer/dashboard" replace />} />
          <Route path="/dashboard/jobs" element={<Navigate to="/employer/jobs" replace />} />
          <Route path="/dashboard/post-job" element={<Navigate to="/employer/post-job" replace />} />
          <Route path="/dashboard/ads" element={<Navigate to="/employer/ads" replace />} />
          <Route path="/dashboard/jobs/:jobId" element={<Navigate to="/employer/jobs/:jobId" replace />} />
          <Route path="/dashboard/jobs/:jobId/edit" element={<Navigate to="/employer/jobs/:jobId/edit" replace />} />

          {/* Wallet & Communication */}
          <Route path="/wallet" element={
            <ProtectedRoute><Wallet /></ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute><Messages /></ProtectedRoute>
          } />

          {/* Account Settings Routes */}
          <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
          <Route path="/account-settings" element={<Navigate to="/settings/profile" replace />} />
          <Route path="/settings/profile" element={
            <ProtectedRoute><AccountSettings forcedTab="profile" /></ProtectedRoute>
          } />
          <Route path="/settings/cv" element={
            <ProtectedRoute><AccountSettings forcedTab="cv_manager" /></ProtectedRoute>
          } />
          <Route path="/settings/password" element={
            <ProtectedRoute><AccountSettings forcedTab="password" /></ProtectedRoute>
          } />
          <Route path="/settings/security" element={
            <ProtectedRoute><AccountSettings forcedTab="password" /></ProtectedRoute>
          } />

          {/* Admin Role Routes */}
          <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
          <Route path="/admin/users" element={
            <ProtectedRoute><Admin forcedTab="users" /></ProtectedRoute>
          } />
          <Route path="/admin/content" element={
            <ProtectedRoute><Admin forcedTab="content" /></ProtectedRoute>
          } />
          <Route path="/admin/disputes" element={
            <ProtectedRoute><Admin forcedTab="disputes" /></ProtectedRoute>
          } />
          <Route path="/admin/finance" element={
            <ProtectedRoute><Admin forcedTab="finance" /></ProtectedRoute>
          } />
          <Route path="/admin/partners" element={
            <ProtectedRoute><Admin forcedTab="partners" /></ProtectedRoute>
          } />
          <Route path="/admin/messages" element={
            <ProtectedRoute><Admin forcedTab="messages" /></ProtectedRoute>
          } />
          <Route path="/admin/analytics" element={
            <ProtectedRoute><Admin forcedTab="analytics" /></ProtectedRoute>
          } />
          <Route path="/admin/ops" element={
            <ProtectedRoute><Admin forcedTab="ops" /></ProtectedRoute>
          } />
          <Route path="/admin/roles" element={
            <ProtectedRoute><Admin forcedTab="roles" /></ProtectedRoute>
          } />
          <Route path="/admin/:module" element={
            <ProtectedRoute><Admin /></ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}