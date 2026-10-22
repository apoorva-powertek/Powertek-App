import { MarketingHome } from "@/components/marketing-home";
import { AuthLinkRedirect } from "@/components/auth-link-redirect";

export default function Home() {
  return <><AuthLinkRedirect /><MarketingHome portalSignInUrl="/portal" /></>;
}

