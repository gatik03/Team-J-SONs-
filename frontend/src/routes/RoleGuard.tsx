import {Navigate,Outlet,useLocation} from 'react-router';
import {useAuth} from '../auth/AuthContext';
import type {Role} from '../api/types';
export function RoleGuard({allow}:{allow:Role[]}){const {user}=useAuth();const location=useLocation();return !user?<Navigate to="/login" replace state={{from:location.pathname}}/>:!allow.includes(user.role)?<Navigate to="/forbidden" replace/>:<Outlet/>;}
