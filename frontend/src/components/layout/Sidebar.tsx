import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiHome,
  FiBriefcase,
  FiFileText,
  FiMessageSquare,
  FiActivity,
  FiCpu,
  FiUsers,
  FiDollarSign,
  FiSettings,
  FiLogOut,
  FiScale,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/', icon: FiHome, label: 'Dashboard' },
  { to: '/cases', icon: FiBriefcase, label: 'Cases' },
  { to: '/documents', icon: FiFileText, label: 'Documents' },
  { to: '/chat', icon: FiMessageSquare, label: 'Chat' },
  { to: '/analysis', icon: FiActivity, label: 'Analysis' },
];

const secondaryItems = [
  { to: '/agents', icon: FiCpu, label: 'Agents' },
  { to: '/clients', icon: FiUsers, label: 'Clients' },
  { to: '/billing', icon: FiDollarSign, label: 'Billing' },
  { to: '/settings', icon: FiSettings, label: 'Settings' },
];

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-primary-900 text-white flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-primary-800">
        <FiScale className="text-primary-300" size={28} />
        <div>
          <h1 className="text-lg font-bold tracking-tight">Legal AI</h1>
          <p className="text-xs text-primary-400">Assistant</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-4 text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2">
          Main
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active' : 'sidebar-link'
            }
          >
            <item.icon size={18} />
            <span className="text-sm">{item.label}</span>
          </NavLink>
        ))}

        <div className="pt-4">
          <p className="px-4 text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2">
            Management
          </p>
          {secondaryItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }
            >
              <item.icon size={18} />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User Info */}
      <div className="border-t border-primary-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center text-sm font-medium">
            {user?.first_name?.[0] || user?.username?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
            </p>
            <p className="text-xs text-primary-400 capitalize">{user?.role || 'User'}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg hover:bg-primary-800 text-primary-400 hover:text-white transition-colors"
            title="Logout"
          >
            <FiLogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
