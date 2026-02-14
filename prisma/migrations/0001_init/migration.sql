CREATE TABLE "Shop" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "shopDomain" TEXT NOT NULL UNIQUE,
  "accessTokenEncrypted" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Finding" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "shopId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "message" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" DATETIME,
  FOREIGN KEY("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);
CREATE INDEX "Finding_shopId_severity_idx" ON "Finding"("shopId", "severity");

CREATE TABLE "ActionLog" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "shopId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "payloadJson" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);

CREATE TABLE "ContentPlan" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "shopId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "itemsJson" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);

CREATE TABLE "AdProject" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "shopId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "script" TEXT NOT NULL,
  "captionsJson" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "outputUrl" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);
CREATE INDEX "AdProject_shopId_status_idx" ON "AdProject"("shopId", "status");
