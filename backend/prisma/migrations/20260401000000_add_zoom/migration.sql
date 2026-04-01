CREATE TABLE "zoom_installations" (
    "id"          TEXT NOT NULL,
    "orgId"       TEXT NOT NULL,
    "accountId"   TEXT NOT NULL,
    "accountName" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zoom_installations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "zoom_installations_orgId_key" ON "zoom_installations"("orgId");
CREATE INDEX "zoom_installations_accountId_idx" ON "zoom_installations"("accountId");

ALTER TABLE "zoom_installations"
    ADD CONSTRAINT "zoom_installations_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
