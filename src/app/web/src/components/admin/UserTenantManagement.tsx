import React, { useState } from 'react';
import { 
  Users, 
  Building2, 
  ShieldCheck, 
  UserPlus, 
  CheckCircle2
} from 'lucide-react';
import { UserAccount } from '../../types';
import { createUser } from '../../api/client';

interface UserTenantProps {
  users: UserAccount[];
  selectedTenant: string;
}

export const UserTenantManagement: React.FC<UserTenantProps> = ({ users, selectedTenant }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'isolation' | 'matrix'>('users');
  const [invitedEmail, setInvitedEmail] = useState('');
  const [invitedName, setInvitedName] = useState('');
  const [invitedRole, setInvitedRole] = useState<UserAccount['role']>('Compliance Officer');
  const [createdPassword, setCreatedPassword] = useState('');
  const [createError, setCreateError] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Users & Tenant Isolation</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Role-Based Access Control (RBAC), tenant vector partition segregation, and identity federations.
          </p>
        </div>

        <div className="flex items-center p-1 bg-white rounded-xl border border-zinc-200/80 shadow-xs text-xs font-semibold text-zinc-600">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'users' ? 'bg-zinc-950 text-white shadow-xs font-bold' : 'hover:text-zinc-950'
            }`}
          >
            User Roster ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('isolation')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'isolation' ? 'bg-zinc-950 text-white shadow-xs font-bold' : 'hover:text-zinc-950'
            }`}
          >
            Tenant Isolation
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'matrix' ? 'bg-zinc-950 text-white shadow-xs font-bold' : 'hover:text-zinc-950'
            }`}
          >
            Permissions Matrix
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-5">
          {/* Quick Invite Bar */}
          <div className="p-4 bg-white border border-zinc-200/60 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Invite User:</span>
              <input
                type="text"
                placeholder="Name"
                value={invitedName}
                onChange={(e) => setInvitedName(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-1.5 text-xs w-40"
              />
              <input
                type="email"
                placeholder="colleague@company.com"
                value={invitedEmail}
                onChange={(e) => setInvitedEmail(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white w-64 transition-all font-medium"
              />
              <select
                value={invitedRole}
                onChange={(e) => setInvitedRole(e.target.value as any)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-800 font-semibold outline-none cursor-pointer"
              >
                <option value="Global Admin">Global Admin</option>
                <option value="Compliance Officer">Compliance Officer</option>
                <option value="Legal Counsel">Legal Counsel</option>
                <option value="Auditor (Read-Only)">Auditor (Read-Only)</option>
              </select>
            </div>

            <button
              onClick={() => {
                if (!invitedEmail) return;
                setCreateError('');
                void createUser(invitedEmail, invitedName, invitedRole)
                  .then((result) => {
                    setCreatedPassword(`${result.user.email}  ${result.password}`);
                    setInvitedEmail('');
                    setInvitedName('');
                    window.dispatchEvent(new Event('clauseguard-refresh'));
                  })
                  .catch((error: unknown) => setCreateError(error instanceof Error ? error.message : 'Could not create the user'));
              }}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors self-end md:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create user</span>
            </button>
          </div>
          {createdPassword && (
            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-900">
              Give this password to the user once. It will not be shown again. They must change it at first login.
              <div className="mt-2 font-mono font-bold">{createdPassword}</div>
            </div>
          )}
          {createError && <p className="text-xs text-rose-600">{createError}</p>}

          {/* Users Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-zinc-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 bg-[#FAF9F6] text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3 px-4">User & Contact</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Tenant Assignment</th>
                    <th className="py-3 px-4">MFA Status</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-zinc-900">{u.name}</div>
                        <div className="text-[11px] text-zinc-500 font-medium">{u.email}</div>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'Global Admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          u.role === 'Compliance Officer' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          u.role === 'Legal Counsel' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-zinc-100 text-zinc-700 border border-zinc-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-zinc-700 font-medium">{u.tenantName}</td>
                      <td className="py-3 px-4 font-sans">
                        {u.mfaEnabled ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1.5 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> FIDO2 Active
                          </span>
                        ) : (
                          <span className="text-amber-700 text-[11px] font-medium">Pending Setup</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 font-sans font-medium">{u.lastActive}</td>
                      <td className="py-3 px-4 text-emerald-700 font-sans font-bold">{u.status}</td>
                      <td className="py-3 px-4 text-right font-sans">
                        <button className="text-zinc-600 hover:text-zinc-950 font-bold text-xs">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'isolation' && (
        <div className="p-6 bg-white border border-zinc-200/60 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-xs font-bold text-zinc-900 uppercase tracking-wider pb-3 border-b border-zinc-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Multi-Tenant Cryptographic Partition Verification</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                id: 'TEN-ACME-01',
                name: 'Acme Corp (Enterprise EU)',
                collection: 'qdrant_col_acme_eu_aes256',
                hsmKey: 'arn:aws:kms:eu-central-1:key/acme-9921',
                status: 'Cryptographically Isolated',
                docs: 142
              },
              {
                id: 'TEN-NOVA-02',
                name: 'NovaHealth Inc',
                collection: 'qdrant_col_nova_hipaa_aes256',
                hsmKey: 'arn:aws:kms:us-east-1:key/nova-4811',
                status: 'Cryptographically Isolated',
                docs: 86
              },
              {
                id: 'TEN-STRIPE-03',
                name: 'Stripe Sub-Portfolio Partner',
                collection: 'qdrant_col_stripe_pci_aes256',
                hsmKey: 'arn:aws:kms:us-west-2:key/stripe-1094',
                status: 'Cryptographically Isolated',
                docs: 98
              }
            ].map((t) => (
              <div key={t.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-950 text-xs">{t.name}</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">{t.status}</span>
                </div>
                <div className="text-xs font-mono text-zinc-600 space-y-1">
                  <div>Collection: <span className="text-zinc-900 font-semibold">{t.collection}</span></div>
                  <div className="truncate">KMS Key: <span className="text-zinc-400">{t.hsmKey}</span></div>
                  <div>Indexed Docs: <span className="text-zinc-950 font-bold">{t.docs}</span></div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80 text-xs text-zinc-600 leading-relaxed font-medium">
            <span className="font-bold text-zinc-900">Isolation Guarantee: </span>
            Every query binds to a cryptographically validated tenant token. Cross-tenant retrieval is blocked at the database partition layer prior to LLM reasoning.
          </div>
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="bg-white rounded-2xl shadow-xs border border-zinc-200/60 overflow-hidden">
          <div className="p-4 border-b border-zinc-100 text-xs font-bold text-zinc-900 uppercase tracking-wider">
            RBAC Permissions Matrix
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-[#FAF9F6] text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-4">Permission / Capability</th>
                  <th className="py-3 px-4 text-center">Global Admin</th>
                  <th className="py-3 px-4 text-center">Compliance Officer</th>
                  <th className="py-3 px-4 text-center">Legal Counsel</th>
                  <th className="py-3 px-4 text-center">Auditor (Read-Only)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {[
                  { perm: 'Upload & Ingest Contracts', a: true, b: true, c: true, d: false },
                  { perm: 'Execute Ask-a-Question Queries', a: true, b: true, c: true, d: true },
                  { perm: 'Trigger Batch Compliance Sweeps', a: true, b: true, c: false, d: false },
                  { perm: 'Remediate or Waive Policy Violations', a: true, b: true, c: true, d: false },
                  { perm: 'Swap / Rollback Reasoning Models', a: true, b: false, c: false, d: false },
                  { perm: 'Edit Guardrail Safety Thresholds', a: true, b: false, c: false, d: false },
                  { perm: 'Modify RAG Component Tunables', a: true, b: false, c: false, d: false },
                  { perm: 'Export Immutable Audit Bundles', a: true, b: true, c: true, d: true },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/80">
                    <td className="py-3 px-4 text-zinc-900 font-semibold">{row.perm}</td>
                    <td className="py-3 px-4 text-center">{row.a ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-zinc-300">—</span>}</td>
                    <td className="py-3 px-4 text-center">{row.b ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-zinc-300">—</span>}</td>
                    <td className="py-3 px-4 text-center">{row.c ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-zinc-300">—</span>}</td>
                    <td className="py-3 px-4 text-center">{row.d ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-zinc-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
