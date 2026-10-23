import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { roleHome } from '../auth/roleHome';
import { useLogin } from '../api/hooks/auth';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { MockBadge } from '../components/ui/MockBadge';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();

  const from = (location.state as { from?: string } | null)?.from;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { username, password },
      {
        onSuccess: (res) => {
          login(res, username);
          navigate(from || roleHome(res.role), { replace: true });
        },
      }
    );
  };

  const handleDemoLogin = (demoUsername: string) => {
    loginMutation.mutate(
      { username: demoUsername, password: 'password' },
      {
        onSuccess: (res) => {
          login(res, demoUsername);
          navigate(from || roleHome(res.role), { replace: true });
        },
      }
    );
  };

  const demoUsers = [
    { username: 'priya.sharma', label: 'Priya Sharma', desc: 'Customer · Salaried' },
    { username: 'rahul.verma', label: 'Rahul Verma', desc: 'Customer · Self-employed' },
    { username: 'ananya.iyer', label: 'Ananya Iyer', desc: 'Customer · Student' },
    { username: 'officer.kumar', label: 'Arjun Kumar', desc: 'Loan Officer' },
    { username: 'analyst.mehta', label: 'Neha Mehta', desc: 'Credit Analyst' },
    { username: 'admin.rao', label: 'Admin Rao', desc: 'Policy Admin' },
  ];

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-soft text-primary font-bold text-xl mb-2">
            LL
          </div>
          <h1 className="text-h1 font-bold text-fg">LoanLens AI</h1>
          <p className="text-sm text-muted">Kestrel Bank Retail Lending Platform</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMutation.error && <ErrorAlert error={loginMutation.error} />}

            <Field id="username" label="Username" required>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
                placeholder="e.g. priya.sharma"
              />
            </Field>

            <Field id="password" label="Password" required>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
                placeholder="password"
              />
            </Field>

            <Button
              type="submit"
              className="w-full"
              loading={loginMutation.isPending}
            >
              Sign in
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Demo users
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {demoUsers.map((u) => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => handleDemoLogin(u.username)}
                  disabled={loginMutation.isPending}
                  className="p-2.5 rounded-md border border-border text-left hover:bg-surface-2 transition-colors focus-ring cursor-pointer"
                >
                  <p className="text-xs font-semibold text-fg">{u.label}</p>
                  <p className="text-[11px] text-muted">{u.desc}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted text-center pt-1">
              Simulated sign-in. All demo passwords are <code className="font-mono bg-surface-2 px-1 py-0.5 rounded">password</code>.
            </p>
          </div>
        </Card>
      </div>

      <MockBadge />
    </div>
  );
}
