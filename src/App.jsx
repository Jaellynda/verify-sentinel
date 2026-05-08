import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Landing from './pages/Landing';
import GetMyID from './pages/GetMyID';
import Dashboard from './pages/Dashboard';
import Verify from './pages/Verify';
import Navbar from './components/Navbar';
import HelpSupport from './pages/HelpSupport';
import AdminAnalytics from './pages/AdminAnalytics';
import { useState } from 'react';
import HexMap from './pages/HexMap';
import OnboardingFlow from './components/OnboardingFlow';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const [lang, setLang] = useState('en');

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <>
      <OnboardingFlow />
      <Navbar lang={lang} onLangChange={setLang} />
      <Routes>
        <Route path="/" element={<Landing lang={lang} />} />
        <Route path="/get-id" element={<GetMyID lang={lang} />} />
        <Route path="/dashboard" element={<Dashboard lang={lang} />} />
        <Route path="/verify" element={<Verify lang={lang} />} />
        <Route path="/help" element={<HelpSupport lang={lang} />} />
        <Route path="/admin" element={<AdminAnalytics lang={lang} />} />
        <Route path="/map" element={<HexMap lang={lang} />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App