import { Link } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { roleHome } from '../auth/roleHome';
import { Button } from '../components/ui/Button';

export function ForbiddenPage() {
  const { user } = useAuth();
  const homePath = user ? roleHome(user.role) : '/login';

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
      <div className="p-4 rounded-full bg-danger-soft text-danger mb-4">
        <ShieldAlert className="w-12 h-12" />
      </div>
      <h1 className="text-h1 font-bold text-fg mb-2">Access Forbidden</h1>
      <p className="text-muted max-w-md mb-6">
        You don't have permission for this page.
      </p>
      <Link to={homePath}>
        <Button>Go to home</Button>
      </Link>
    </div>
  );
}
