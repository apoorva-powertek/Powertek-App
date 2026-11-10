import Image from 'next/image';

/** A captured client application state, with no public workspace controls or API calls. */
export function ClientDashboardVisual(){
 const description='Powertek client dashboard showing assigned projects, 288 survey records, project coverage and deliverables';
 return <figure className="home-dashboard-visual" aria-label="Client dashboard image">
  {(['light','dark'] as const).map(theme=><picture key={theme} className={`dashboard-image-${theme}`}>
   <source media="(max-width: 600px)" srcSet={`/client-dashboard-mobile-${theme}.webp`}/>
   <Image src={`/client-dashboard-${theme}.webp`} alt={description} width={1440} height={1082} priority unoptimized/>
  </picture>)}
 </figure>;
}
