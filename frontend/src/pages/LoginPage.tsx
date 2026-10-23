import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Landmark, ShieldCheck, ArrowRight } from "lucide-react";
import { useLogin } from "../api/hooks/auth";
import { useAuth } from "../auth/AuthContext";
import { roleHome } from "../auth/roleHome";
import { Button } from "../components/ui/Button";
import { ErrorAlert } from "../components/ui/ErrorAlert";
const users = [
  ["priya.sharma", "Priya Sharma", "Customer · Salaried"],
  ["rahul.verma", "Rahul Verma", "Customer · Self-employed"],
  ["ananya.iyer", "Ananya Iyer", "Customer · Student"],
  ["officer.kumar", "Arjun Kumar", "Loan Officer"],
  ["analyst.mehta", "Neha Mehta", "Credit Analyst"],
  ["admin.rao", "Policy Admin", "Policy Admin"],
];
export function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("priya.sharma");
  const [password, setPassword] = useState("password");
  const mutation = useLogin();
  if (user) return <Navigate to={roleHome(user.role)} replace />;
  const signIn = async (name: string, pass: string) => {
    try {
      const res = await mutation.mutateAsync({
        username: name,
        password: pass,
      });
      login(res, name);
      nav(roleHome(res.role));
    } catch {
      /* Render the API error below. */
    }
  };
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand">
          <span className="brand-mark">
            <Landmark />
          </span>
          <span>
            Kestrel Bank<small>LoanLens</small>
          </span>
        </div>
        <div>
          <h1>
            Big plans.
            <br />
            Clearer possibilities.
          </h1>
          <p>
            A home of your own. Your next car. A brighter future.
            <br />
            Find the right financing, with a little more clarity.
          </p>
          <div className="story-rule" />
          <span className="story-caption">
            <ShieldCheck size={19} /> Thoughtful technology. Human decisions.
          </span>
        </div>
        <small>
          A synthetic banking experience, built for the LoanLens AI hackathon.
        </small>
      </section>
      <section className="login-panel">
        <div className="login-form">
          <h2>Welcome to LoanLens</h2>
          <p>Sign in to make your next move.</p>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void signIn(username, password);
            }}
          >
            <label>
              Username
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <ErrorAlert error={mutation.error} />
            <Button disabled={mutation.isPending}>
              {mutation.isPending ? "Signing in…" : "Sign in"}
              <ArrowRight size={18} />
            </Button>
          </form>
          <p className="mt-5 text-sm">New here? <Link to="/register" className="text-primary font-semibold underline">Create a customer account</Link></p>
          <div className="demo-heading">
            <span>Explore a demo workspace</span>
          </div>
          <div className="demo-users">
            {users.map(([id, name, role]) => (
              <button
                key={id}
                disabled={mutation.isPending}
                onClick={() => void signIn(id, "password")}
              >
                <span className="avatar">{name.charAt(0)}</span>
                <span>
                  <strong>{name}</strong>
                  <small>{role}</small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
          <p className="fineprint">
            Simulated sign-in. All demo passwords are <code>password</code>.
          </p>
        </div>
      </section>
    </div>
  );
}
