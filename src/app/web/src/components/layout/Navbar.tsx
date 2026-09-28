import React, { useState, useRef, useEffect } from 'react';
import { NavigationTab } from '../../types';
import { ClauseGuardLogo } from './ClauseGuardLogo';
import { 
  Bell, 
  ChevronDown, 
  SlidersHorizontal,
  Building2,
  User,
  LogOut,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface NavbarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  selectedTenant: string;
  onSelectTenant: (tenant: string) => void;
  userEmail: string;
  userName?: string;
  userRole?: string;
  isCompactDensity?: boolean;
  onToggleDensity?: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  selectedTenant,
  onSelectTenant,
  userEmail,
  userName = 'Michael Carter',
  userRole = 'Lead Legal Counsel',
  isCompactDensity = true,
  onToggleDensity,
  onLogout
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: { id: NavigationTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'batch_sweep', label: 'Batch Sweep' },
    { id: 'policy_rulesets', label: 'Policy Ruleset' },
    { id: 'admin_operations', label: 'Admin Operations' },
    { id: 'spec_review', label: 'Spec Review' }
  ];

  return (
    <header className="bg-[#F5F4F0] border-b border-zinc-200/80 sticky top-0 z-40 px-6 py-2.5">
      <div className="max-w-[1520px] mx-auto flex items-center justify-between">
        {/* Brand Logo & Main Navigation - Single line, non-wrapping */}
        <div className="flex items-center gap-6 lg:gap-8 shrink-0">
          <div onClick={() => onSelectTab('dashboard')} className="shrink-0 cursor-pointer">
            <ClauseGuardLogo size="md" />
          </div>

          {/* Navigation Tabs - Strictly whitespace-nowrap so text is never divided into 2 lines */}
          <nav className="flex items-center gap-5 lg:gap-6 text-sm font-medium whitespace-nowrap shrink-0">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative pb-1.5 transition-colors whitespace-nowrap ${
                  currentTab === item.id
                    ? 'text-zinc-950 font-bold after:absolute after:bottom-[-11px] after:left-0 after:right-0 after:h-[2.5px] after:bg-zinc-950'
                    : 'text-zinc-500 hover:text-zinc-900 font-semibold'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right side: Tenant switcher, Notifications, User Avatar with Role */}
        <div className="flex items-center gap-3">
          {/* UI Density Toggle */}
          {onToggleDensity && (
            <button
              onClick={onToggleDensity}
              className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-xs text-xs font-semibold transition-all ${
                isCompactDensity 
                  ? 'bg-zinc-950 text-white border-zinc-950' 
                  : 'bg-white text-zinc-700 border-zinc-200/80 hover:bg-zinc-50'
              }`}
              title="Toggle Compact UI density"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isCompactDensity ? 'Compact' : 'Standard'}</span>
            </button>
          )}

          {/* Tenant Name Pill */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-zinc-200/80 shadow-xs text-xs">
            <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <select
              value={selectedTenant}
              onChange={(e) => onSelectTenant(e.target.value)}
              className="bg-transparent font-semibold text-zinc-900 outline-none cursor-pointer pr-1"
            >
              <option value="TEN-ACME-01">Acme Corp (EU)</option>
              <option value="TEN-NOVA-02">NovaHealth Inc</option>
              <option value="TEN-STRIPE-03">Stripe Sub-Portfolio</option>
            </select>
          </div>

          {/* Notification Bell with Dropdown */}
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2.5 rounded-full bg-white border border-zinc-200/80 hover:bg-zinc-50 transition-colors shadow-xs"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-zinc-700" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-zinc-200 shadow-lg p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                  <span className="text-xs font-bold text-zinc-900">Compliance & Audit Alerts</span>
                  <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">1 New</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
                    <div className="flex items-center justify-between font-bold text-zinc-900">
                      <span>Uncapped Liability Detected</span>
                      <span className="text-[10px] text-zinc-400 font-mono">10m ago</span>
                    </div>
                    <p className="text-zinc-600 text-[11px]">Snowflake Enterprise MSA Section 11.4 exceeds liability super-cap.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-50/50 border border-zinc-100 space-y-1 opacity-70">
                    <div className="flex items-center justify-between font-bold text-zinc-900">
                      <span>Batch Sweep Completed</span>
                      <span className="text-[10px] text-zinc-400 font-mono">2h ago</span>
                    </div>
                    <p className="text-zinc-600 text-[11px]">24 contracts evaluated against Risk Standard v3.4.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Card Pill at top-right corner with picture and role */}
          <div className="relative" ref={profileMenuRef}>
            <div 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full bg-white border border-zinc-200/80 shadow-xs cursor-pointer hover:border-zinc-300 transition-colors"
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="User Avatar"
                className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-200"
              />
              <div className="text-left leading-tight hidden sm:block">
                <div className="text-xs font-bold text-zinc-950 truncate max-w-[120px]">{userName}</div>
                <div className="text-[11px] text-zinc-500 font-medium truncate max-w-[120px]">{userRole}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
            </div>

            {/* Profile Dropdown Popover */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl border border-zinc-200/90 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95">
                {/* User Summary Header */}
                <div className="p-3 rounded-2xl bg-zinc-50/80 border border-zinc-100 flex items-center gap-3">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    alt="User Avatar"
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-xs"
                  />
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-zinc-950 truncate">{userName}</div>
                    <div className="text-[11px] text-zinc-500 font-mono truncate">{userEmail}</div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      {userRole}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-2 space-y-1 text-xs font-semibold">
                  <button
                    onClick={() => {
                      onSelectTab('user_profile');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 transition-colors text-left"
                  >
                    <User className="w-4 h-4 text-zinc-500" />
                    <span>View User Profile & Access Rights</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTab('admin_operations');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 transition-colors text-left"
                  >
                    <Sliders className="w-4 h-4 text-zinc-500" />
                    <span>Admin Operations Console</span>
                  </button>

                  <div className="border-t border-zinc-100 my-1 pt-1">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
