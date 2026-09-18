export type PortalRole = "admin" | "client";

export type PortalUser = {
  id: string;
  authUserId: string | null;
  email: string;
  displayName: string;
  role: PortalRole;
  status: "active" | "disabled";
};

export type AttachmentRecord = {
  id: string;
  name: string;
  heightM: number;
  photoX: number | null;
  photoY: number | null;
  side: "left" | "right";
  color: string | null;
  kind: string;
  sortOrder: number;
};

export type PoleRecord = {
  id: string;
  projectId: string;
  poleName: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  topHeightM: number | null;
  poleHeightFt: number | null;
  poleClass: string | null;
  status: "complete" | "location_only";
  imageFilename: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  sourceJsonFilename: string | null;
  modelVersion: string | null;
  toolName: string | null;
  baseX: number | null;
  baseY: number | null;
  topX: number | null;
  topY: number | null;
  attachments: AttachmentRecord[];
};

export type ImportAttachment = {
  name: string;
  heightM: number;
  photoX?: number | null;
  photoY?: number | null;
  side?: "left" | "right";
  color?: string | null;
  kind?: string;
};

export type ImportPole = {
  poleName: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  topHeightM?: number | null;
  poleHeightFt?: number | null;
  poleClass?: string | null;
  imageFilename?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  sourceJsonFilename?: string | null;
  modelVersion?: string | null;
  toolName?: string | null;
  baseX?: number | null;
  baseY?: number | null;
  topX?: number | null;
  topY?: number | null;
  rawJson?: unknown;
  attachments?: ImportAttachment[];
};
