import React from 'react';
import { NavLink } from 'react-router-dom';
import { authService } from '../services/api';
import { 
  LayoutDashboard, 
  Store, 
  Layers, 
  Video, 
  Package, 
  Users, 
  LogOut,
  ShieldAlert
} from 'lucide-react';

export default function Sidebar() {
  const userString = localStorage.getItem('user');
  let user = null;
  if (userString) {
    try {
      user = JSON.parse(userString);
    } catch (e) {
      // ignore
    }
  }

  const role = user?.role?.name || 'Retail Analyst';
  const isAdmin = role === 'Administrator';

  const menuItems = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/stores', label: 'Stores', icon: Store },
    { path: '/shelves', label: 'Shelves & Zones', icon: Layers },
    { path: '/cameras', label: 'Cameras', icon: Video },
    { path: '/products', label: 'Products', icon: Package },
  ];

  if (isAdmin) {
    menuItems.push({ path: '/users', label: 'User Controls', icon: Users });
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen text-slate-300">
      {/* Title / Logo Area */}
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <span className="font-extrabold text-white text-lg tracking-wider">ATTENTION MAP</span>
      </div>

      {/* User Status Card */}
      <div className="p-4 mx-4 my-4 bg-slate-950/40 border border-slate-850 rounded-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold">
            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">{user?.full_name || 'User'}</h4>
            <span className="inline-block text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full mt-1">
              {role}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-600/15 border border-purple-500/30 text-purple-400 font-semibold'
                    : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Area */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => authService.logout()}
          className="flex items-center space-x-3 w-full px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 rounded-lg transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
