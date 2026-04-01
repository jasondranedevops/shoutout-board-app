CREATE TABLE "slack_app_configs" (
    "id"               TEXT NOT NULL,
    "orgId"            TEXT NOT NULL,
    "clientId"         TEXT NOT NULL,
    "clientSecretEnc"  TEXT NOT NULL,
    "signingSecretEnc" TEXT NOT NULL,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slack_app_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "slack_app_configs_orgId_key" ON "slack_app_configs"("orgId");

ALTER TABLE "slack_app_configs"
    ADD CONSTRAINT "slack_app_configs_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "zoom_app_configs" (
    "id"                   TEXT NOT NULL,
    "orgId"                TEXT NOT NULL,
    "clientId"             TEXT NOT NULL,
    "clientSecretEnc"      TEXT NOT NULL,
    "botJid"               TEXT,
    "verificationTokenEnc" TEXT,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zoom_app_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "zoom_app_configs_orgId_key" ON "zoom_app_configs"("orgId");

ALTER TABLE "zoom_app_configs"
    ADD CONSTRAINT "zoom_app_configs_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
