"use client";
import {useEffect} from 'react';
export function MarketingMotion(){
 useEffect(()=>{const root=document.querySelector<HTMLElement>('.powertek-site');if(!root)return;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>root.classList.toggle('motion-enabled',!reduced.matches);sync();reduced.addEventListener('change',sync);return()=>{root.classList.remove('motion-enabled');reduced.removeEventListener('change',sync);};},[]);
 return null;
}
