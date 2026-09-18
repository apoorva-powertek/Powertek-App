import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const portalUsers = sqliteTable(
  "portal_users",
  {
    id: text("id").primaryKey(),
    authUserId: text("auth_user_id"),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role", { enum: ["admin", "client"] }).notNull().default("client"),
    status: text("status", { enum: ["active", "disabled"] }).notNull().default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_portal_users_email").on(table.email),
    uniqueIndex("idx_portal_users_auth_user_id").on(table.authUserId),
  ],
);

export const clients = sqliteTable(
  "clients",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("idx_clients_code").on(table.code)],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    description: text("description").notNull().default(""),
    locationLabel: text("location_label").notNull().default(""),
    status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_projects_client_id").on(table.clientId),
    uniqueIndex("idx_projects_client_code").on(table.clientId, table.code),
  ],
);

export const userProjects = sqliteTable(
  "user_projects",
  {
    userId: text("user_id").notNull().references(() => portalUsers.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    assignedAt: text("assigned_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.projectId] }),
    index("idx_user_projects_project_id").on(table.projectId),
  ],
);

export const poles = sqliteTable(
  "poles",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    poleName: text("pole_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    elevationM: real("elevation_m").notNull(),
    topHeightM: real("top_height_m"),
    poleHeightFt: real("pole_height_ft"),
    poleClass: text("pole_class"),
    status: text("status", { enum: ["complete", "location_only"] }).notNull().default("location_only"),
    imageKey: text("image_key"),
    imageFilename: text("image_filename"),
    imageWidth: integer("image_width"),
    imageHeight: integer("image_height"),
    sourceJsonFilename: text("source_json_filename"),
    modelVersion: text("model_version"),
    toolName: text("tool_name"),
    baseX: real("base_x"),
    baseY: real("base_y"),
    topX: real("top_x"),
    topY: real("top_y"),
    rawJson: text("raw_json"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_poles_project_name").on(table.projectId, table.poleName),
    index("idx_poles_project_id").on(table.projectId),
    index("idx_poles_project_normalized").on(table.projectId, table.normalizedName),
  ],
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    poleId: text("pole_id").notNull().references(() => poles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    heightM: real("height_m").notNull(),
    photoX: real("photo_x"),
    photoY: real("photo_y"),
    side: text("side", { enum: ["left", "right"] }).notNull().default("right"),
    color: text("color"),
    kind: text("kind").notNull().default("attachment"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("idx_attachments_pole_id").on(table.poleId)],
);

export const projectFiles = sqliteTable(
  "project_files",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    poleId: text("pole_id").references(() => poles.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["image", "json", "spreadsheet", "export"] }).notNull(),
    objectKey: text("object_key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_project_files_project_id").on(table.projectId),
    uniqueIndex("idx_project_files_object_key").on(table.objectKey),
  ],
);
