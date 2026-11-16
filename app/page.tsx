import { MarketingHome } from "@/components/marketing-home";
import { AuthLinkRedirect } from "@/components/auth-link-redirect";

import {publicMetadata} from '@/lib/marketing-content';
export const metadata=publicMetadata('Transmission Engineering & Inspection','Engineering clarity for stronger utility networks. Transmission line modelling, aerial inspection and connected project delivery from Powertek.','/');

export default function Home() {
  return <><AuthLinkRedirect /><MarketingHome portalSignInUrl="/portal" /></>;
}

