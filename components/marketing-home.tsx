import Image from "next/image";
import { MarketingHeader } from "@/components/marketing-header";
import { MarketingMotion } from "@/components/marketing-motion";
import { ArrowRight, ArrowUpRight, Activity, Camera, Compass, Download, FileCheck2, Layers3, LockKeyhole, MapPinned, ShieldCheck, Zap } from "lucide-react";

const services = [
  { icon: Compass, title: "Transmission line modelling", tag: "DESIGN & ANALYSIS", body: "PLS-CADD modelling of conductors, structures, terrain, and aerial obstacles for informed line design." },
  { icon: Activity, title: "Thermal rating analysis", tag: "NETWORK CAPACITY", body: "Understand conductor temperatures and operating limits to make confident capacity decisions." },
  { icon: Layers3, title: "Vegetation risk management", tag: "LIDAR INTELLIGENCE", body: "Identify grow-in and tree-fall hazards with LiDAR data and PLS-CADD danger-tree analysis." },
  { icon: Camera, title: "High-resolution inspection", tag: "ASSET CONDITION", body: "Georeferenced imagery brings cracks, corrosion, and visible asset conditions into clear focus." },
  { icon: Zap, title: "Thermal IR surveys", tag: "FAULT DETECTION", body: "Radiometric inspection helps locate potential hot spots at structures and mid-span joints." },
  { icon: ShieldCheck, title: "Corona UV inspection", tag: "PREVENTIVE INSPECTION", body: "Solar-blind UV imaging detects discharge associated with damaged or loose components." },
];

export function MarketingHome({ portalSignInUrl }: { portalSignInUrl: string }) {
  return <main className="brand-site" id="top">
    <MarketingMotion />
    <MarketingHeader portalSignInUrl={portalSignInUrl} />
    <section className="site-hero">
      <Image className="hero-landscape" src="/transmission-landscape.jpg" alt="Transmission towers and power lines across an open landscape at sunset" fill priority sizes="100vw" />
      <div className="hero-content">
        <p className="brand-eyebrow hero-badge"><span/> ENGINEERING INTELLIGENCE, CONNECTED <ArrowUpRight size={13}/></p>
        <h1>Engineering power.<br/><em>Delivering confidence.</em></h1>
        <p className="hero-description">A clearer picture of your network. Specialist transmission engineering, aerial inspection, and asset intelligence — from the field to your next decision.</p>
        <div className="hero-buttons"><a className="brand-button orange" href="#services">Discover our expertise <ArrowRight size={19}/></a><a className="text-link" href="mailto:vnr@powertekecp.com">Discuss your project <ArrowUpRight size={19}/></a></div>
      </div>
      <div className="intelligence-visual" aria-label="Illustration of connected survey records">
        <div className="floating-note note-precision"><span><Compass size={17}/></span><div><b>Precision by design</b><small>From capture to clarity</small></div></div>
        <div className="intelligence-card">
          <div className="intelligence-card-heading"><span><Layers3 size={17}/> CONNECTED INTELLIGENCE</span><i/></div>
          <div className="network-canvas">
            <div className="network-grid"/>
            <svg viewBox="0 0 400 210" fill="none" aria-hidden="true"><path className="network-route-back" d="M-15 170C65 175 60 70 145 91S239 183 282 97 346 44 415 48"/><path className="network-route" d="M-15 170C65 175 60 70 145 91S239 183 282 97 346 44 415 48"/>
              <g className="network-nodes"><circle cx="74" cy="117" r="7"/><circle cx="145" cy="91" r="7"/><circle cx="231" cy="133" r="7"/><circle cx="297" cy="71" r="7"/><circle cx="362" cy="44" r="7"/></g>
              <circle className="network-pulse" cx="231" cy="133" r="15"/><text x="73" y="146">ASSET 01</text><text x="278" y="104">ASSET 04</text>
            </svg>
            <span className="network-caption"><MapPinned size={12}/> FIELD DATA, IN CONTEXT</span>
            <div className="network-detail"><Camera size={16}/><div><b>Every detail, connected.</b><span>Location · imagery · measurements</span></div><ShieldCheck size={15}/></div>
          </div>
          <div className="intelligence-records"><span><MapPinned size={17}/><b>Locate</b><small>See the network</small></span><span><Camera size={17}/><b>Inspect</b><small>Explore the detail</small></span><span><FileCheck2 size={17}/><b>Decide</b><small>Review with clarity</small></span></div>
          <div className="intelligence-card-footer"><LockKeyhole size={12}/> ILLUSTRATIVE WORKSPACE <span>POWERTEK</span></div>
        </div>
        <div className="floating-note note-private"><span><ShieldCheck size={17}/></span><div><b>Your projects. Protected.</b><small>Private, assigned access</small></div></div>
      </div>
      <div className="hero-bottom"><span><ShieldCheck size={19}/> PRECISION. FROM LINE TO ASSET.</span><a href="#services">EXPLORE POWERTEK <span>↓</span></a><span>TRANSMISSION / INSPECTION / INTELLIGENCE</span></div>
    </section>
    <div className="expertise-strip"><span>CONNECTED EXPERTISE</span><p>Transmission engineering <i/> Aerial inspection <i/> Asset intelligence <i/> Project delivery</p></div>
    <section className="site-section" id="services"><div className="section-heading" data-reveal><div><p className="brand-eyebrow">01 — OUR EXPERTISE</p><h2>The expertise behind<br/>a stronger network.</h2></div><p>Specialist engineering and inspection services that help you understand asset condition, reduce risk, and plan what comes next.</p></div><div className="expertise-grid">{services.map(({icon: Icon, title, tag, body}, index)=><article key={title} data-reveal><div className="service-top"><span><Icon size={24}/></span><small>0{index+1}</small></div><p className="service-tag">{tag}</p><h3>{title}</h3><p>{body}</p><a href={`mailto:vnr@powertekecp.com?subject=${encodeURIComponent(title + " enquiry")}`}>Discuss this service <ArrowUpRight size={18}/></a></article>)}</div></section>
    <section className="approach-section" id="approach"><div className="approach-orb" aria-hidden="true"/><div><p className="brand-eyebrow">02 — FROM FIELD TO DECISION</p><h2>Every detail matters.<br/><em>We keep it in view.</em></h2><p>Keep the big picture and the smallest detail in view. Our engineering and inspection work connects field records to practical project deliverables.</p><a className="text-link" href="#workspace">Discover your workspace <ArrowRight size={18}/></a></div><ol className="approach-steps"><li data-reveal><span>01</span><div><h3>Capture the detail</h3><p>Georeferenced imagery, LiDAR, and measured asset records.</p></div><Camera/></li><li data-reveal><span>02</span><div><h3>Understand the network</h3><p>Engineering models and inspection analysis with context.</p></div><Compass/></li><li data-reveal><span>03</span><div><h3>Deliver with clarity</h3><p>Organized project data, reports, and original-quality files.</p></div><FileCheck2/></li></ol></section>
    <section className="site-section workspace-section" id="workspace"><div className="workspace-intro" data-reveal><p className="brand-eyebrow">03 — YOUR CONNECTED WORKSPACE</p><h2>From the field.<br/>Straight to your workspace.</h2><p>A secure workspace for your team to explore assigned projects, inspect pole records, and access the files you need.</p><div className="workspace-benefits"><span><MapPinned/> Mapped pole locations</span><span><Camera/> Original-resolution photos</span><span><Layers3/> Measured engineering profiles</span><span><Download/> Reports and project downloads</span></div><a className="brand-button navy" href={portalSignInUrl}>Open your client workspace <ArrowRight size={18}/></a></div><div data-reveal className="portal-showcase" aria-label="Illustration of the client workspace"><header><Image src="/powertek-logo.svg" alt="Powertek" width={362} height={108}/><span><ShieldCheck size={14}/> PRIVATE WORKSPACE</span></header><div className="showcase-body"><aside><span className="showcase-active"><Layers3 size={16}/> Projects</span><span><MapPinned size={16}/> Asset records</span><span><Download size={16}/> Deliverables</span></aside><div><p className="brand-eyebrow">PROJECT OVERVIEW · ILLUSTRATION</p><h3>Everything in view.</h3><div className="showcase-tiles"><span><MapPinned/><b>Locations</b><small>Explore in context</small></span><span><Camera/><b>Imagery</b><small>Review every detail</small></span></div><div className="showcase-record"><FileCheck2/><div><b>Survey deliverables</b><span>Maps, measurements, and reports</span></div><ShieldCheck/></div><p className="showcase-note"><LockKeyhole size={13}/> Access assigned by your administrator</p></div></div></div></section>
    <section className="site-contact"><div data-reveal><p className="brand-eyebrow">LET’S BUILD A CLEARER PICTURE</p><h2>Your next project<br/>starts with a conversation.</h2><a className="brand-button orange" href="mailto:vnr@powertekecp.com">Get in touch <ArrowUpRight size={18}/></a></div><div className="contact-information"><a href="mailto:vnr@powertekecp.com"><small>EMAIL US</small><b>vnr@powertekecp.com</b></a><a href="tel:+919573263993"><small>CALL US</small><b>+91 95732 63993</b></a><p><small>FIND US</small>Plot No 56 &amp; 57, Road No 5/3<br/>Nizampet, Hyderabad 500090, India</p></div></section>
    <footer className="site-footer"><a href="#top"><Image className="site-logo" src="/powertek-logo.svg" alt="Powertek Utility Services" width={362} height={108}/></a><p>Engineering insight. Reliable networks.</p><a href={portalSignInUrl}>Client sign in <ArrowUpRight size={14}/></a><small>© {new Date().getFullYear()} Powertek Utility Services</small></footer>
  </main>;
}
