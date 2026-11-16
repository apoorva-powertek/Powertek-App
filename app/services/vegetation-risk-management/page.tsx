import {MarketingServiceDetail} from '@/components/marketing-service-detail';
import {publicMetadata,serviceBySlug} from '@/lib/marketing-content';
const service=serviceBySlug('vegetation-risk-management');
export const metadata=publicMetadata(service.title,service.summary,'/services/'+service.slug);
export default function Page(){return <MarketingServiceDetail service={service}/>;}
