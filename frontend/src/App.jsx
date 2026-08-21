import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Route>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/company/:slug" element={<CompanyProfile />} />
          <Route path="/u/:slug" element={<StudentProfile />} />
          <Route path="/pricing" element={<Pricing />} />

          <Route path="/mywork" element={
            <ProtectedRoute><MyWork /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/post-job" element={
            <ProtectedRoute><PostJob /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/dashboard/jobs/:jobId" element={
            <ProtectedRoute><JobApplicants /></ProtectedRoute>
          } />
          <Route path="/wallet" element={
            <ProtectedRoute><Wallet /></ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute><Messages /></ProtectedRoute>
          } />
          <Route path="/account-settings" element={
            <ProtectedRoute><AccountSettings /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><AccountSettings /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute><Admin /></ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}