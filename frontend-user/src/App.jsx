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
import Talents from './pages/customer/Talents';
import Dashboard from './pages/employer/Dashboard';
import JobApplicants from './pages/employer/JobApplicants';
import Wallet from './pages/customer/Wallet';
import Messages from './pages/customer/Messages';
import AccountSettings from './pages/customer/AccountSettings';
import PaymentResult from './pages/customer/PaymentResult';
import TermsOfService from './pages/legal/TermsOfService';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import PaymentRefundPolicy from './pages/legal/PaymentRefundPolicy';
import Contact from './pages/customer/Contact';
import Forbidden from './pages/customer/Forbidden';
import ScrollToTop from './components/ScrollToTop';

export default function App() {
  const EMPLOYER_ROLES = ['employer', 'recruiter', 'business', 'admin'];
  const STUDENT_ROLES = ['student', 'admin'];

  return (
    <BrowserRouter>
      <ScrollToTop />
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
          <Route path="/student/:slug" element={<StudentProfile />} />
          <Route path="/talents" element={<Talents />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/payment-policy" element={<PaymentRefundPolicy />} />
          <Route path="/dispute-policy" element={<PaymentRefundPolicy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/forbidden" element={<Forbidden />} />
          <Route path="/403" element={<Forbidden />} />

          {/* Student Role Routes */}
          <Route path="/mywork" element={
            <ProtectedRoute allowedRoles={STUDENT_ROLES}><MyWork /></ProtectedRoute>
          } />
          <Route path="/student/mywork" element={
            <ProtectedRoute allowedRoles={STUDENT_ROLES}><MyWork /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/student/profile" element={
            <ProtectedRoute allowedRoles={STUDENT_ROLES}><Profile /></ProtectedRoute>
          } />

          {/* Employer Role Routes */}
          <Route path="/employer" element={
            <ProtectedRoute allowedRoles={EMPLOYER_ROLES}><Dashboard forcedTab="overview" /></ProtectedRoute>
          } />
          <Route path="/employer/dashboard" element={
            <ProtectedRoute allowedRoles={EMPLOYER_ROLES}><Dashboard forcedTab="overview" /></ProtectedRoute>
          } />
          <Route path="/employer/jobs" element={
            <ProtectedRoute allowedRoles={EMPLOYER_ROLES}><Dashboard forcedTab="jobs" /></ProtectedRoute>
          } />
          <Route path="/employer/post-job" element={
            <ProtectedRoute allowedRoles={EMPLOYER_ROLES}><Dashboard forcedTab="post" /></ProtectedRoute>
          } />
          <Route path="/employer/create-job" element={
            <ProtectedRoute allowedRoles={EMPLOYER_ROLES}><Dashboard forcedTab="post" /></ProtectedRoute>
          } />
          <Route path="/employer/ads" element={
            <ProtectedRoute allowedRoles={EMPLOYER_ROLES}><Dashboard forcedTab="ads" /></ProtectedRoute>
          } />
          <Route path="/employer/jobs/:jobId/edit" element={
            <ProtectedRoute allowedRoles={EMPLOYER_ROLES}><Dashboard forcedTab="edit" /></ProtectedRoute>
          } />
          <Route path="/employer/jobs/:jobId" element={
            <ProtectedRoute allowedRoles={EMPLOYER_ROLES}><JobApplicants /></ProtectedRoute>
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
          <Route path="/payment/result" element={<PaymentResult />} />
          <Route path="/messages" element={
            <ProtectedRoute><Messages /></ProtectedRoute>
          } />

          {/* Account Settings Routes */}
          <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
          <Route path="/account-settings" element={<Navigate to="/settings/profile" replace />} />
          <Route path="/settings/profile" element={
            <ProtectedRoute><AccountSettings forcedTab="profile" /></ProtectedRoute>
          } />
          <Route path="/settings/kyc" element={
            <ProtectedRoute><AccountSettings forcedTab="kyc" /></ProtectedRoute>
          } />
          <Route path="/settings/verification" element={
            <ProtectedRoute><AccountSettings forcedTab="kyc" /></ProtectedRoute>
          } />
          <Route path="/settings/cv" element={
            <ProtectedRoute allowedRoles={STUDENT_ROLES}><AccountSettings forcedTab="cv_manager" /></ProtectedRoute>
          } />
          <Route path="/settings/password" element={
            <ProtectedRoute><AccountSettings forcedTab="password" /></ProtectedRoute>
          } />
          <Route path="/settings/security" element={
            <ProtectedRoute><AccountSettings forcedTab="password" /></ProtectedRoute>
          } />

          {/* Catch-all 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}