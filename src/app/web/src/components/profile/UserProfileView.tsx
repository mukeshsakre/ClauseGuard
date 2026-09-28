import React, { useState } from 'react';
import { UserProfileInfo } from '../../types';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Building2, 
  KeyRound, 
  CheckCircle2, 
  Lock, 
  Smartphone, 
  Clock, 
  Globe, 
  Sliders, 
  Copy, 
  Check, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  LogOut
} from 'lucide-react';

interface UserProfileViewProps {
  profile: UserProfileInfo;
  onLogout: () => void;
  onNavigateToAdmin?: () => void;
  onSelectTenant?: (tenant: string) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  profile,
  onLogout,
  onNavigateToAdmin,
  onSelectTenant
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'access_rights' | 'security'>('details');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-8">
      {/* Top Banner & Profile Header */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-8 shadow-xs mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-20 h-20 rounded-2xl object-cover ring-2 ring-zinc-100 shadow-sm"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-950">{profile.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {profile.userType}
                </span>
              </div>

              <p className="text-xs text-zinc-500 font-medium mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-zinc-600">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  {profile.email}
                </span>
                <span className="text-zinc-300">·</span>
                <span className="flex items-center gap-1.5 text-zinc-600">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                  {profile.tenantName} ({profile.tenantId})
                </span>
              </p>

              <p className="text-xs text-zinc-400 mt-1.5">
                {profile.department} · Authenticated via {profile.authProvider}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateToAdmin && (
              <button
                onClick={onNavigateToAdmin}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                <span>Admin Operations</span>
              </button>
            )}

            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs within Profile */}
        <div className="flex items-center gap-2 mt-8 pt-6 border-t border-zinc-100">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'details'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            Profile & Tenant Overview
          </button>
          <button
            onClick={() => setActiveTab('access_rights')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'access_rights'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            Access Rights & Permissions
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'security'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            Security & Authentication
          </button>
        </div>
      </div>

      {/* Tab 1: Profile & Tenant Overview */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-3xl border border-zinc-200/90 p-7 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900 mb-5 flex items-center gap-2">
              <User className="w-4 h-4 text-zinc-500" />
              User Information & Credentials
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-100">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Full Name</span>
                <p className="text-sm font-bold text-zinc-900 mt-1">{profile.name}</p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-100">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Email Address</span>
                <p className="text-sm font-bold text-zinc-900 mt-1 font-mono">{profile.email}</p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-100">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Assigned Role</span>
                <p className="text-sm font-bold text-zinc-900 mt-1">{profile.role}</p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-100">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">User Type</span>
                <p className="text-sm font-bold text-zinc-900 mt-1">{profile.userType}</p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-100">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Tenant Scope</span>
                <p className="text-sm font-bold text-zinc-900 mt-1">{profile.tenantName}</p>
                <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">{profile.tenantId}</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-100">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Last Authenticated</span>
                <p className="text-xs font-semibold text-zinc-800 mt-1.5">{profile.lastLogin}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-zinc-200/90 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Active Tenant Isolation
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Your account is cryptographically pinned to the <strong className="text-zinc-900">{profile.tenantName}</strong> namespace. Ingested contracts and embeddings are isolated with per-tenant AES-256 keys.
              </p>
              
              <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs">
                <span className="text-zinc-500">Tenant Namespace:</span>
                <span className="font-mono font-semibold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded">ns-acme-eu-prod</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-zinc-200/90 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-zinc-900 mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Multi-Factor Authentication
              </h3>
              <p className="text-xs text-zinc-500">
                FIDO2 WebAuthn Hardware Security Key and Okta Verify push notifications active.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
                Hardware MFA Enforced
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Access Rights & Permissions */}
      {activeTab === 'access_rights' && (
        <div className="space-y-6">
          {profile.accessRights.map((group, idx) => (
            <div key={idx} className="bg-white rounded-3xl border border-zinc-200/90 p-7 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {group.category}
                </h3>
                <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full">
                  {group.permissions.filter(p => p.granted).length} of {group.permissions.length} Granted
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {group.permissions.map((perm, pIdx) => (
                  <div 
                    key={pIdx}
                    className={`p-4 rounded-2xl border transition-all ${
                      perm.granted 
                        ? 'bg-white border-zinc-200/80 shadow-xs' 
                        : 'bg-zinc-50/60 border-zinc-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-xs font-bold text-zinc-900">{perm.name}</h4>
                      {perm.granted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-semibold">Denied</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 leading-normal">{perm.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Security & Authentication */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl border border-zinc-200/90 p-7 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-950 mb-1 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-zinc-600" />
              API Credentials & Integration Tokens
            </h3>
            <p className="text-xs text-zinc-500">
              Active API tokens associated with your ClauseGuard identity for programmatic legal queries.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900">Enterprise Service Key (Read-Only Search)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200 text-zinc-800">Production</span>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-1">cg_live_9981a8c8****************34ef</p>
              <span className="text-[11px] text-zinc-400">Created: 2026-08-10 · Last used 14 mins ago</span>
            </div>

            <button
              onClick={() => copyToClipboard('cg_live_9981a8c871fa288921be34ef', 'api-key-1')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              {copiedKey === 'api-key-1' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Copy Key</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>Identity Provider: <strong>Okta SAML 2.0 (SSO)</strong></span>
            <span>Session Duration: <strong>8 Hours (Auto-Renew on activity)</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
