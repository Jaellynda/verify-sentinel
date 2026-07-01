import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Menu, X, Wifi, WifiOff, LogOut } from 'lucide-react';
import { LANGUAGES } from '../lib/i18n';
import { supabase } from '@/api/base44Client';
import { useProfile } from '../hooks/useProfile';

export default function Navbar({ lang, onLangChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const individualNav = [
    { path: '/get-id', label: 'Get My ID' },
    { path: '/dashboard', label: 'My Dashboard' },
    { path: '/map', label: 'Hex Map' },
    { path: '/help', label: 'Help' },
    { path: '/verification-guide', label: 'Guide' },
  ];

  const businessNav = [
    { path: '/verify', label: 'Verify Client' },
    { path: '/business', label: 'Business Dashboard' },
    { path: '/map', label: 'Coverage Map' },
    { path: '/help', label: 'Help' },
  ];

  const navItems = profile?.account_type === 'business' ? businessNav : individualNav;
  const accentColor = profile?.account_type === 'business' ? 'text-blue-400' : 'text-green-400';
  const accentBg = profile?.account_type === 'business' ? 'bg-blue-400/20' : 'bg-green-400/20';

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/60"
        style={{ background: 'rgba(4,8,18,0.97)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link to={profile?.account_type === 'business' ? '/verify' : '/get-id'} className="flex items-center gap-2 group">
            <div className="relative">
              <Shield className={`w-7 h-7 ${accentColor} group-hover:opacity-80 transition-all`} />
              <div className={`absolute inset-0 ${accentBg} rounded-full blur-md`} />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight text-lg">Verify</span>
              <span className={`font-bold ${accentColor} tracking-tight text-lg`}>Sentinel</span>
            </div>
          </Link>

          {/* Account type badge */}
          {profile?.account_type && (
            <div className={`hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
              profile.account_type === 'business'
                ? 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                : 'border-green-500/30 text-green-400 bg-green-500/10'
            }`}>
              {profile.account_type === 'business' ? 'Business Account' : 'Individual Account'}
            </div>
          )}

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map(item => (
              <Link key={item.path} to={item.path}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === item.path ? accentColor : 'text-slate-400 hover:text-white'
                }`}>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </div>

            <select value={lang} onChange={e => onLangChange(e.target.value)}
              className="bg-slate-800/80 border border-blue-900/50 text-white text-xs rounded px-2 py-1 outline-none cursor-pointer">
              {Object.entries(LANGUAGES).map(([code, info]) => (
                <option key={code} value={code}>{info.flag} {info.name}</option>
              ))}
            </select>

            <button onClick={handleSignOut}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700/50 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all text-xs font-medium">
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>

            <button onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-slate-400 hover:text-white transition-colors">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 border-t border-zinc-800/60"
            style={{ background: 'rgba(4,8,18,0.99)', backdropFilter: 'blur(20px)' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-6" />
            {profile?.account_type && (
              <div className={`mb-4 text-center text-xs font-medium px-3 py-1.5 rounded-full border w-fit mx-auto ${
                profile.account_type === 'business'
                  ? 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                  : 'border-green-500/30 text-green-400 bg-green-500/10'
              }`}>
                {profile.account_type === 'business' ? 'Business Account' : 'Individual Account'}
              </div>
            )}
            <div className="flex flex-col gap-1">
              {navItems.map(item => (
                <Link key={item.path} to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    location.pathname === item.path
                      ? `bg-green-500/10 ${accentColor} border border-green-500/30`
                      : 'text-slate-300 hover:bg-white/5'
                  }`}>
                  {item.label}
                </Link>
              ))}
              <button onClick={() => { setMenuOpen(false); handleSignOut(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/5 transition-all mt-1">
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
              <div className={`flex items-center gap-1.5 text-xs ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>{isOnline ? 'Online' : 'Offline Mode Active'}</span>
              </div>
              <select value={lang} onChange={e => onLangChange(e.target.value)}
                className="bg-slate-800 border border-blue-900/50 text-white text-xs rounded px-2 py-1 outline-none">
                {Object.entries(LANGUAGES).map(([code, info]) => (
                  <option key={code} value={code}>{info.flag} {info.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
