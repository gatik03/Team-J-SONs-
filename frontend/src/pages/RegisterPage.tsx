import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Landmark } from 'lucide-react';
import { useRegister } from '../api/hooks/auth';
import type { CustomerSegment } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { roleHome } from '../auth/roleHome';
import { Button } from '../components/ui/Button';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { todayIso } from '../lib/formatDate';

export function RegisterPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const registration = useRegister();
  const [error, setError] = useState<string | null>(null);
  if (user) return <Navigate to={roleHome(user.role)} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (registration.isPending) return;
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? '');
    if (value('password') !== value('confirmPassword')) { setError('Passwords do not match.'); return; }
    setError(null);
    const username = value('username').trim().toLowerCase();
    try {
      const response = await registration.mutateAsync({ username, password: value('password'), fullName: value('fullName'),
        email: value('email'), phone: value('phone'), dateOfBirth: value('dateOfBirth'),
        segment: value('segment') as CustomerSegment, monthlyIncome: Number(value('monthlyIncome')), location: value('location') });
      login(response, username);
      navigate('/products', { replace: true });
    } catch { /* The mutation error is rendered below; preserve entered fields. */ }
  }

  return (
    <main className="min-h-screen bg-bg text-fg px-5 py-10 flex justify-center">
      <section className="login-form">
        <Link to="/login" className="flex items-center gap-2 text-primary font-semibold mb-7"><Landmark size={24} /> Kestrel Bank · LoanLens</Link>
        <h2>Create your account</h2>
        <p>Explore loans and track your applications. Use synthetic details for this demo.</p>
        <form onSubmit={submit}>
          <fieldset disabled={registration.isPending} className="space-y-4 border-0 p-0 m-0">
            <label>Full name<input name="fullName" autoComplete="name" required minLength={2} maxLength={100} /></label>
            <label>Username<input name="username" autoComplete="username" required minLength={3} maxLength={40} pattern={'[a-zA-Z0-9][a-zA-Z0-9._\\-]*'} title="3–40 letters, numbers, dots, underscores or hyphens" /></label>
            <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
            <label>Phone<input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={20} /></label>
            <label>Date of birth<input name="dateOfBirth" type="date" autoComplete="bday" min="1900-01-01" max={todayIso()} required /></label>
            <label>Customer segment
              <select name="segment" className="w-full rounded-md border border-border bg-surface text-fg px-3 py-2.5 text-sm" defaultValue="SALARIED">
                <option value="SALARIED">Salaried</option><option value="SELF_EMPLOYED">Self-employed</option><option value="STUDENT">Student</option>
              </select>
            </label>
            <label>Monthly income (₹)<input name="monthlyIncome" type="number" min={0} max={100000000} step={1} required /></label>
            <label>City / location<input name="location" autoComplete="address-level2" minLength={2} maxLength={100} required /></label>
            <label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
            <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
          </fieldset>
          {error && <p role="alert" className="text-danger text-sm">{error}</p>}
          <ErrorAlert error={registration.error} />
          <Button type="submit" loading={registration.isPending}>Create account</Button>
        </form>
        <p className="mt-5 text-sm">Already registered? <Link to="/login" className="text-primary underline font-semibold">Sign in</Link></p>
      </section>
    </main>
  );
}
