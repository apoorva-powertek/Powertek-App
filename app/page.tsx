import { chatGPTSignInPath } from "@/app/chatgpt-auth";
import { MarketingHome } from "@/components/marketing-home";

export default function Home() {
  return <MarketingHome portalSignInUrl={chatGPTSignInPath("/portal")} />;
}
