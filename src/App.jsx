import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/api/base44Client';
import PageNotFound from './lib/PageNotFound';
import Login from './pages/Login';
import Landing from './pages/Landing';
import GetMyID from './pages/GetMyID';
import Dashboard from './pages/Dashboard';
import Verify from './pages/Verify';
import Navbar from './components/Navbar';
import HelpSupport from './pages/HelpSupport';
import AdminAnalytics from './pages/AdminAnalytics';
import HexMap from './pages/HexMap';
import OnboardingFlow from './components/OnboardingFlow';
import VerificationGuide from './pages/VerificationGuide';
import BusinessDashboard from './pages/BusinessDashboard';

function ProtectedRoute({ session, children }) {
  if (session === undefined) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#060B13' }}>
        <div className="w-8 h-8 border-4 border-slate-800 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const [session, setSession] = useState(undefined);
  const [lang, setLang] = useState('en');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing lang={lang} />} />
          <Route path="/login" element={
            session ? <Navigate to="/dashboard" replace /> : <Login />
          } />
          <Route path="/verify" element={<Verify lang={lang} />} />
          <Route path="/verification-guide" element={<VerificationGuide />} />

          {/* Protected routes */}
          <Route path="/get-id" element={
            <ProtectedRoute session={session}>
              <OnboardingFlow />
              <Navbar lang={lang} onLangChange={setLang} />
              <GetMyID lang={lang} />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute session={session}>
              <OnboardingFlow />
              <Navbar lang={lang} onLangChange={setLang} />
              <Dashboard lang={lang} />
            </ProtectedRoute>
          } />
          <Route path="/help" element={
            <ProtectedRoute session={session}>
              <Navbar lang={lang} onLangChange={setLang} />
              <HelpSupport lang={lang} />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute session={session}>
              <Navbar lang={lang} onLangChange={setLang} />
              <AdminAnalytics lang={lang} />
            </ProtectedRoute>
          } />
          <Route path="/map" element={
            <ProtectedRoute session={session}>
              <Navbar lang={lang} onLangChange={setLang} />
              <HexMap lang={lang} />
            </ProtectedRoute>
          } />
          <Route path="/business" element={
            <ProtectedRoute session={session}>
              <Navbar lang={lang} onLangChange={setLang} />
              <BusinessDashboard lang={lang} />
            </ProtectedRoute>
          } />

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
