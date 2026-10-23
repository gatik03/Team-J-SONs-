import { Link } from 'react-router';
import { HelpCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { roleHome } from '../auth/roleHome';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  const { user } = useAuth();
  const homePath = user ? roleHome(user.role) : '/login';

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
      <div className="p-4 rounded-full bg-surface-2 text-muted mb-4">
        <HelpCircle className="w-12 h-12" />
      </div>
      <h1 className="text-h1 font-bold text-fg mb-2">Page Not Found</h1>
      <p className="text-muted max-w-md mb-6">
        The page you are looking for does not exist.
      </p>
      <Link to={homePath}>
        <Button>Return home</Button>
      </Link>
    </div>
  );
}
