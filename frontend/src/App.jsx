import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AuthLayout from './components/AuthLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Auth from './pages/auth/Auth';
import VerifyEmail from './pages/VerifyEmail';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import MyWork from './pages/MyWork';
import Profile from './pages/Profile';
import CompanyProfile from './pages/CompanyProfile';
import StudentProfile from './pages/StudentProfile';
import Pricing from './pages/Pricing';
import PostJob from './pages/PostJob';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import Admin from './pages/Admin';
import Messages from './pages/Messages';
import AccountSettings from './pages/AccountSettings';

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
          <Route path="/wallet" element={
            <ProtectedRoute><Wallet /></ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute><Messages /></ProtectedRoute>
          } />
          <Route path="/account-settings" element={
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