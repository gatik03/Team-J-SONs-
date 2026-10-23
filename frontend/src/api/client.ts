import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import type {ErrorResponse, LoginResponse} from './types';
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
export type Session = LoginResponse & {username:string};
export const AUTH_STORAGE_KEY = 'll-auth';
export function readStoredAuth(): Session|null { try {return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? 'null') as Session|null;} catch {return null;} }
export class ApiError extends Error { constructor(public body:ErrorResponse) {super(body.message);} get status(){return this.body.status;} }
export async function api<T>(path:string, options:{method?:string;body?:unknown;form?:FormData}={}):Promise<T> {
  const token=readStoredAuth()?.token;
  let response:Response;
  try {response=await fetch(API_BASE+path,{method:options.method??'GET',headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(options.body!==undefined?{'Content-Type':'application/json'}:{})},body:options.form??(options.body!==undefined?JSON.stringify(options.body):undefined)});}
  catch {throw new Error('Cannot reach Kestrel Bank. Check your connection and try again.');}
  if(response.status===401&&token)window.dispatchEvent(new Event('ll:unauthorized'));
  const raw=await response.text();let data:unknown;
  try {data=raw?JSON.parse(raw):null;} catch {throw new Error('The server returned an unexpected response. Please try again.');}
  if(!response.ok)throw new ApiError(data as ErrorResponse);
  return data as T;
}
export function useRead<T>(path:string, enabled=true){return useQuery({queryKey:[path],queryFn:()=>api<T>(path),enabled});}
export function useAction<T,B=unknown>(path:string,method='POST'){
  const cache=useQueryClient();
  return useMutation({mutationFn:(body:B)=>api<T>(path,{method,...(body instanceof FormData?{form:body}:{body})}),onSuccess:()=>cache.invalidateQueries()});
}
