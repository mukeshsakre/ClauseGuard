import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { ClauseGuardLogo } from '../layout/ClauseGuardLogo';
import { ApiUser, changePassword, login, saveToken } from '../../api/client';

interface LoginScreenProps {
  onAuthenticated: (user: ApiUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthenticated }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [mustChange, setMustChange] = useState(false);
  const [pendingUser, setPendingUser] = useState<ApiUser | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = () => {
    setBusy(true);
    setError('');
    void login(email, password)
      .then((result) => {
        saveToken(result.token);
        if (result.user.must_change_password) {
          setPendingUser(result.user);
          setMustChange(true);
          return;
        }
        onAuthenticated(result.user);
      })
      .catch(() => setError('Email or password is wrong.'))
      .finally(() => setBusy(false));
  };

  const replacePassword = () => {
    setBusy(true);
    setError('');
    void changePassword(password, nextPassword)
      .then(() => {
        if (pendingUser) onAuthenticated({ ...pendingUser, must_change_password: false });
      })
      .catch(() => setError('Use the temporary password, then a new one of at least 10 characters.'))
      .finally(() => setBusy(false));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F5F4F0]">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-zinc-200/80 p-8 space-y-6">
        <div className="text-center flex flex-col items-center space-y-2">
          <ClauseGuardLogo size="lg" />
          <p className="text-xs text-zinc-500 font-medium pt-2">Sign in with the password from your administrator.</p>
        </div>
        {mustChange ? (
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); replacePassword(); }}>
            <p className="text-xs text-zinc-600">This is your first sign-in. Set a new password before continuing.</p>
            <PasswordField label="Temporary password" value={password} onChange={setPassword} />
            <PasswordField label="New password" value={nextPassword} onChange={setNextPassword} />
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <Submit label={busy ? 'Saving...' : 'Save password'} />
          </form>
        ) : (
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); signIn(); }}>
            <label className="block text-xs font-semibold text-zinc-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs"
                required
              />
            </label>
            <PasswordField label="Password" value={password} onChange={setPassword} />
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <Submit label={busy ? 'Signing in...' : 'Sign in'} />
          </form>
        )}
      </div>
    </div>
  );
};

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-semibold text-zinc-700">
      {label}
      <div className="relative mt-1.5">
        <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
        <input
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 text-xs"
          required
        />
      </div>
    </label>
  );
}

function Submit({ label }: { label: string }) {
  return (
    <button type="submit" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-950 text-white text-xs font-bold">
      {label}
      <ArrowRight className="w-4 h-4" />
    </button>
  );
}
