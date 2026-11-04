"use client";
import {useState} from 'react';
import {ArrowUpRight,Bell,Check} from 'lucide-react';
import {WorkspaceDialog} from './workflow-dialog';
import {workspaceRequest} from '@/lib/workspace-request';
export type PortalNotification={id:string;project_id:string;title:string;message:string;created_at:string;read_at:string|null};
export function NotificationCenter({notifications,onChanged,projects}:{notifications:PortalNotification[];projects:{id:string;can_view?:boolean}[];onChanged:()=>Promise<void>}){
 const [open,setOpen]=useState(false),[error,setError]=useState('');
 const unread=notifications.filter(n=>!n.read_at).length;
 async function read(item:PortalNotification,navigate=false){try{if(!item.read_at)await workspaceRequest('/api/notifications',{method:'POST',body:JSON.stringify({id:item.id})});if(navigate)window.location.replace(`/projects/${encodeURIComponent(item.project_id)}`);else await onChanged();}catch(e){setError(e instanceof Error?e.message:'Could not update notification.');}}
 return <><button className="notification-toggle" type="button" onClick={()=>setOpen(true)} aria-label={`Notifications${unread?`, ${unread} unread`:''}`}><Bell size={19}/>{unread>0&&<span>{unread>9?'9+':unread}</span>}</button>{open&&<WorkspaceDialog title="Notifications" onClose={()=>setOpen(false)}>{error&&<p className="error-banner" role="alert">{error}</p>}{notifications.length?notifications.map(item=><article className={`notification-item ${item.read_at?'':'unread'}`} key={item.id}><span className="notification-mark"><Bell size={17}/></span><div><h3>{item.title}</h3><p>{item.message}</p><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time><div className="delivery-actions">{projects.some(p=>p.id===item.project_id&&p.can_view!==false)?<button className="text-button" onClick={()=>void read(item,true)}>View project <ArrowUpRight size={15}/></button>:<span className="subtle-badge">Project update is not currently available</span>}{!item.read_at&&<button className="text-button" onClick={()=>void read(item)}><Check size={14}/>Mark read</button>}</div></div></article>):<div className="attention-empty"><Bell size={28}/><strong>No notifications yet</strong><p>Project review requests and client-ready updates will appear here.</p></div>}</WorkspaceDialog>}</>;
}
