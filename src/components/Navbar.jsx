import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Menu, X, Wifi, WifiOff } from 'lucide-react';
import { LANGUAGES } from '../lib/i18n';

export default function Navbar({ lang, onLangChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/get-id', label: 'Get My ID' },
    { path: '/verify', label: 'Verify' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/help', label: 'Help' },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/60"
        style={{ background: 'rgba(4,8,18,0.97)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Shield className="w-7 h-7 text-green-400 group-hover:text-green-300 transition-colors" />
              <div className="absolute inset-0 bg-green-400/20 rounded-full blur-md group-hover:bg-green-300/30 transition-all" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight text-lg">Verify</span>
              <span className="font-bold text-green-400 tracking-tight text-lg">Sentinel</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map(item => (
              <Link key={item.path} to={item.path}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'text-green-400'
                    : 'text-slate-400 hover:text-white'
                }`}>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Offline Indicator */}
            <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </div>

            {/* Language Selector */}
            <select
              value={lang}
              onChange={e => onLangChange(e.target.value)}
              className="bg-slate-800/80 border border-blue-900/50 text-white text-xs rounded px-2 py-1 outline-none cursor-pointer"
            >
              {Object.entries(LANGUAGES).map(([code, info]) => (
                <option key={code} value={code}>{info.flag} {info.name}</option>
              ))}
            </select>

            {/* Mobile menu button */}
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
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 border-t border-zinc-800/60"
            style={{ background: 'rgba(4,8,18,0.99)', backdropFilter: 'blur(20px)' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-6" />
            <div className="flex flex-col gap-1">
              {navItems.map(item => (
                <Link key={item.path} to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    location.pathname === item.path
                      ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}>
                  {item.label}
                </Link>
              ))}
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