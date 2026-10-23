import {createContext,useContext,useState,useEffect,type ReactNode} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {AUTH_STORAGE_KEY,readStoredAuth,type Session} from '../api/client';
import type {LoginResponse,Role} from '../api/types';
export interface AuthValue {user:Session|null;login:(res:LoginResponse,username:string)=>void;logout:()=>void}
export const AuthContext=createContext<AuthValue|null>(null);
export const roleHome=(role:Role)=>role==='CUSTOMER'?'/products':role==='POLICY_ADMIN'?'/admin/policies':'/officer/queue';
export function AuthProvider({children}:{children:ReactNode}){
  const [user,setUser]=useState(readStoredAuth);const cache=useQueryClient();
  const logout=()=>{setUser(null);try{localStorage.removeItem(AUTH_STORAGE_KEY);}catch{/* Storage may be disabled. */}cache.clear();};
  useEffect(()=>{window.addEventListener('ll:unauthorized',logout);return()=>window.removeEventListener('ll:unauthorized',logout);},[]);
  const login=(res:LoginResponse,username:string)=>{const session={...res,username};cache.clear();setUser(session);try{localStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify(session));}catch{/* Session remains available for this tab. */}};
  return <AuthContext.Provider value={{user,login,logout}}>{children}</AuthContext.Provider>;
}
export function useAuth(){const auth=useContext(AuthContext);if(!auth)throw new Error('AuthProvider is required');return auth;}
