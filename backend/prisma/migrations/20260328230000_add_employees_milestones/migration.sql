-- CreateTable: employees
CREATE TABLE "employees" (
    "id"         TEXT NOT NULL,
    "orgId"      TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "email"      TEXT,
    "department" TEXT,
    "birthday"   TIMESTAMP(3),
    "hireDate"   TIMESTAMP(3),
    "active"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable: milestone_configs
CREATE TABLE "milestone_configs" (
    "id"                 TEXT NOT NULL,
    "orgId"              TEXT NOT NULL,
    "birthdayEnabled"    BOOLEAN NOT NULL DEFAULT true,
    "anniversaryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "daysAhead"          INTEGER NOT NULL DEFAULT 7,
    "autoActivate"       BOOLEAN NOT NULL DEFAULT true,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestone_configs_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "employees_orgId_idx" ON "employees"("orgId");
CREATE UNIQUE INDEX "milestone_configs_orgId_key" ON "milestone_configs"("orgId");

-- Foreign Keys
ALTER TABLE "employees"
    ADD CONSTRAINT "employees_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "milestone_configs"
    ADD CONSTRAINT "milestone_configs_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
