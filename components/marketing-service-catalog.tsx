"use client";
import {useEffect,useState} from 'react';
import {ArrowRight,ArrowUpRight} from 'lucide-react';
import {marketingServices} from '@/lib/marketing-content';
import {EngineeringGraphic} from './engineering-graphic';
export function MarketingServiceCatalog(){
 const [filter,setFilter]=useState<'all'|'engineering'|'inspection'>('all'),[ready,setReady]=useState(false);
 useEffect(()=>{const timer=window.setTimeout(()=>setReady(true),0);return()=>window.clearTimeout(timer);},[]);
 const services=marketingServices.filter(s=>filter==='all'||s.group===filter);
 return <section className="pt-site-container pt-site-catalog" aria-label="Powertek services"><div className="pt-site-catalog-toolbar"><div role="group" aria-label="Filter services">{([{id:'all',label:'All services'},{id:'engineering',label:'Engineering & analysis'},{id:'inspection',label:'Inspection & surveys'}] as const).map(item=><button key={item.id} disabled={!ready} aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)}>{item.label}</button>)}</div><span role="status">{services.length} services</span></div><div className="pt-site-catalog-grid">{services.map(service=><a key={service.slug} href={'/services/'+service.slug} className="pt-site-service-card"><EngineeringGraphic kind={service.graphic} compact/><div><h2>{service.title}</h2><p>{service.summary}</p><span>Explore this service<ArrowUpRight size={18}/></span></div></a>)}</div><div className="pt-site-service-help"><p>Not sure which service fits your project?</p><a href="/contact" className="pt-site-text-link">Let’s work through it together<ArrowRight size={17}/></a></div></section>;
}
