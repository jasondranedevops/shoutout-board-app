CREATE TABLE "slack_installations" (
    "id"              TEXT NOT NULL,
    "orgId"           TEXT NOT NULL,
    "teamId"          TEXT NOT NULL,
    "teamName"        TEXT NOT NULL,
    "botToken"        TEXT NOT NULL,
    "botUserId"       TEXT NOT NULL,
    "incomingChannel" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slack_installations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "slack_installations_orgId_key" ON "slack_installations"("orgId");
CREATE INDEX "slack_installations_teamId_idx" ON "slack_installations"("teamId");

ALTER TABLE "slack_installations"
    ADD CONSTRAINT "slack_installations_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
