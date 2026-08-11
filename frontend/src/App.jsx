import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AuthLayout from './components/AuthLayout';
import Home from './pages/Home';
import Auth from './pages/Auth';
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/auth" element={<Auth />} />
        </Route>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/mywork" element={<MyWork />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/company/:slug" element={<CompanyProfile />} />
          <Route path="/u/:slug" element={<StudentProfile />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/post-job" element={<PostJob />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
