/* eslint-disable @next/next/no-html-link-for-pages -- Native anchors preserve navigation in the deployed Vinext app. */
"use client";
import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,LockKeyhole,Menu,X} from 'lucide-react';
import {ThemeControl} from './theme-control';

const items=[{href:'/services',label:'Services'},{href:'/about',label:'About Powertek'},{href:'/process',label:'Our process'},{href:'/contact',label:'Contact'}];
export function MarketingHeader({portalSignInUrl='/portal',activePath='/'}:{portalSignInUrl?:string;activePath?:string}){
 const [open,setOpen]=useState(false),[ready,setReady]=useState(false);
 const header=useRef<HTMLElement>(null),toggle=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const timer=window.setTimeout(()=>setReady(true),0);const media=window.matchMedia('(min-width:1001px)');const resize=()=>{if(media.matches)setOpen(false);};const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);if(header.current?.contains(document.activeElement))toggle.current?.focus();}};const outside=(event:PointerEvent)=>{if(!header.current?.contains(event.target as Node))setOpen(false);};media.addEventListener('change',resize);document.addEventListener('keydown',close);document.addEventListener('pointerdown',outside);return()=>{window.clearTimeout(timer);media.removeEventListener('change',resize);document.removeEventListener('keydown',close);document.removeEventListener('pointerdown',outside);};},[]);
 const current=(href:string)=>activePath===href?'page':activePath.startsWith(href+'/')?'location':undefined;
 return <header className="pt-site-header" ref={header}><div className="pt-site-header-inner"><a href="/" className="pt-site-brand" aria-label="Powertek home"><Image src="/powertek-logo.svg" alt="Powertek Utility Services" width={362} height={108} priority/></a><nav className="pt-site-desktop-nav" aria-label="Main navigation">{items.map(item=><a key={item.href} href={item.href} aria-current={current(item.href)}>{item.label}</a>)}</nav><div className="pt-site-header-actions"><ThemeControl disabled={!ready}/><a href={portalSignInUrl} className="pt-site-signin"><LockKeyhole size={15}/>Client sign in<ArrowUpRight size={15}/></a><button ref={toggle} className="pt-site-menu-toggle" disabled={!ready} aria-label={open?'Close navigation menu':'Open navigation menu'} aria-controls="pt-site-mobile-navigation" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X size={21}/>:<Menu size={21}/>}</button></div></div><nav id="pt-site-mobile-navigation" className="pt-site-mobile-nav" aria-label="Mobile navigation" hidden={!open}>{items.map(item=><a key={item.href} href={item.href} aria-current={current(item.href)} onClick={()=>setOpen(false)}>{item.label}<ArrowUpRight size={16}/></a>)}<a href={portalSignInUrl} onClick={()=>setOpen(false)}>Client sign in<LockKeyhole size={16}/></a></nav></header>;
}
