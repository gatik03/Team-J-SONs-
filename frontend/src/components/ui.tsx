import type {ReactNode,ButtonHTMLAttributes} from 'react';
import {AlertCircle,ArrowUpRight,LoaderCircle} from 'lucide-react';
import {ApiError} from '../api/client';
export const formatInr=(n:number|null|undefined)=>n==null?'—':new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
export const formatDate=(date:string)=>new Date(date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
export const human=(s:string)=>s.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
export function Button({children,secondary=false,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{secondary?:boolean}){return <button className={secondary?'btn secondary':'btn'} {...props}>{children}</button>;}
export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:string}){return <span className={`badge ${tone}`}>{children}</span>;}
export function AiTag(){return <Badge tone="amber">AI assisted</Badge>;}
export function ErrorAlert({error}:{error:unknown}){if(!error)return null;return <div className="error" role="alert"><AlertCircle size={18}/><div>{error instanceof Error?error.message:String(error)}{error instanceof ApiError&&<><small>{error.body.code}</small><ul>{error.body.details?.map((d,i)=><li key={i}>{d.field}: {d.issue}</li>)}</ul></>}</div></div>;}
export function Loading(){return <div role="status" className="loading"><LoaderCircle className="spin" size={20}/> Loading your information…</div>;}
export function Empty({children}:{children:ReactNode}){return <div className="empty">{children}</div>;}
export function PageHead({title,description,action}:{title:string;description:string;action?:ReactNode}){return <div className="page-head"><div><h1>{title}</h1><p>{description}</p></div>{action}</div>;}
export function Money({value}:{value:number|null|undefined}){return <span className="money">{formatInr(value)}</span>;}
export function Arrow(){return <ArrowUpRight size={18}/>;}
export const disclaimer='Indicative only. Final approval is subject to credit assessment.';
