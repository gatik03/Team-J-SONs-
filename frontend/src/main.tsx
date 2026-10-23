import React from 'react';
import ReactDOM from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {RouterProvider} from 'react-router';
import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles/app.css';
import {AuthProvider} from './auth/AuthContext';
import {router} from './routes/router';
import {ApiError,USE_MOCKS} from './api/client';
try{document.documentElement.dataset.theme=localStorage.getItem('ll-theme')??(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}catch{/* Use the light palette when storage is disabled. */}
const queryClient=new QueryClient({defaultOptions:{queries:{refetchOnWindowFocus:false,retry:(count,error)=>!(error instanceof ApiError&&error.status<500)&&count<1}}});
async function start(){if(USE_MOCKS){const {worker}=await import('./mocks/browser');await worker.start({onUnhandledRequest:'bypass'});}ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={queryClient}><AuthProvider><RouterProvider router={router}/></AuthProvider></QueryClientProvider></React.StrictMode>);}
void start();
