import type {PoleRecord} from "./portal-types";
export type ProjectInfo = { published_at?:string|null;requires_approval?:boolean; id: string; name: string; code: string; description: string; location_label: string; status: string; client_id: string; client_name: string; client_code: string };
export type ProjectPayload={canEdit?:boolean;project:ProjectInfo;poles:PoleRecord[]};
