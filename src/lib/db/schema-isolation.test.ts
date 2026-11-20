import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = path.resolve(import.meta.dirname, "../../../");
const schema = readFileSync(path.join(root, "db/schema.sql"), "utf8");
const migration = readFileSync(
  path.join(root, "db/migrations/0001_multitenant_auth.sql"),
  "utf8",
);
const migration2 = readFileSync(
  path.join(root, "db/migrations/0002_operacao.sql"),
  "utf8",
);
const migration3 = readFileSync(
  path.join(root, "db/migrations/0003_lgpd.sql"),
  "utf8",
);

const childTables = [
  "boarding_points",
  "passengers",
  "seats",
  "installments",
  "rooms",
  "room_assignments",
];

describe("esquema multi-tenant", () => {
  test("tabelas de auth do Better Auth estão no schema e na migração", () => {
    for (const source of [schema, migration]) {
      expect(source).toContain('create table if not exists "user"');
      expect(source).toContain('create table if not exists "session"');
      expect(source).toContain('create table if not exists "account"');
      expect(source).toContain('create table if not exists "verification"');
      expect(source).toContain('"password" text');
    }
  });

  test("agência registra trial de 14 dias e membership owner/staff ativo", () => {
    for (const source of [schema, migration]) {
      expect(source).toMatch(/trial_ends_at timestamptz/i);
      expect(source).toContain("interval '14 days'");
      expect(source).toContain("agency_memberships");
      expect(source).toContain("role in ('owner', 'staff')");
      expect(source).toContain("status in ('active', 'revoked')");
      expect(source).toContain("agency_memberships_one_active_user_idx");
    }
  });

  test("filhos têm agency_id NOT NULL, índices e FK composta que impede cruzamento", () => {
    expect(schema).toMatch(/create table excursions \([\s\S]*unique \(id, agency_id\)/);
    for (const table of childTables) {
      const block = extractTable(schema, table);
      expect(block, table).toMatch(/agency_id uuid not null references agencies/);
      expect(block, table).toContain("unique (id, agency_id)");
      expect(schema.toLowerCase()).toContain(`on ${table} (agency_id`);
    }
    expect(schema).toContain("foreign key (excursion_id, agency_id)");
    expect(schema).toContain("references excursions (id, agency_id)");
    expect(schema).toContain("foreign key (boarding_point_id, excursion_id, agency_id)");
    expect(schema).toContain("references boarding_points (id, excursion_id, agency_id)");
    expect(schema).toContain("foreign key (passenger_id, excursion_id, agency_id)");
    expect(schema).toContain("references passengers (id, excursion_id, agency_id)");
    expect(schema).toContain("foreign key (room_id, agency_id)");
    expect(schema).toContain("references rooms (id, agency_id)");
    expect(schema).toContain("foreign key (passenger_id, agency_id)");
    expect(schema).toContain("references passengers (id, agency_id)");
    expect(migration).toContain("add constraint passengers_boarding_excursion_agency_fk");
    expect(migration).toContain("add constraint seats_passenger_excursion_agency_fk");
    expect(migration).toContain("add constraint room_assignments_passenger_agency_fk");
  });

  test("0002 adiciona chave Pix, layouts de veículo e CPF único por excursão", () => {
    expect(schema).toContain("pix_key text");
    expect(schema).toContain("pix_key_type text");
    expect(schema).toContain("vehicle_layout text not null default 'coach_2_2'");
    expect(schema).toContain("'coach_46', 'coach_50', 'van_15'");
    expect(schema).toContain("side in ('left', 'right', 'center')");
    expect(schema).toContain("position in ('window', 'aisle', 'middle')");
    expect(schema).toContain("passengers_unique_cpf_per_excursion_idx");
    expect(migration2).toContain("pix_key");
    expect(migration2).toContain("vehicle_layout");
    expect(migration2).toContain("passengers_unique_cpf_per_excursion_idx");
    expect(migration2).toContain("center");
    expect(migration2).toContain("middle");
  });
});

  test("0003 adiciona auditoria, convites de staff e anonimização", () => {
    for (const source of [schema, migration3]) {
      expect(source).toContain("create table");
      expect(source).toContain("audit_log");
      expect(source).toContain("agency_invites");
      expect(source).toContain("agency_id");
      expect(source).toContain("user_id");
      expect(source).toContain("anonymize_passenger");
      expect(source).toContain("export_passenger");
      expect(source).toContain("import_csv");
      expect(source).toContain("export_antt");
      expect(source).toContain("mark_paid");
      expect(source).toContain("token_hash");
      expect(source).toContain("expires_at");
    }
    expect(schema).toMatch(/create table audit_log \([\s\S]*unique \(id, agency_id\)/);
    expect(schema).toMatch(/create table agency_invites \([\s\S]*unique \(id, agency_id\)/);
    expect(schema).toContain("on audit_log (agency_id, created_at desc)");
    expect(schema).toContain("anonymized_at timestamptz");
    expect(migration3).toContain("add column if not exists anonymized_at");
    expect(migration3).toContain("token_hash text not null unique");
    const audit = extractTable(schema, "audit_log");
    expect(audit.toLowerCase()).not.toContain("full_name");
    expect(audit.toLowerCase()).not.toContain("document_number");
    expect(audit.toLowerCase()).not.toContain("phone");
    expect(audit.toLowerCase()).not.toContain("email");
    expect(audit.toLowerCase()).not.toContain("cpf");
  });

function extractTable(sql: string, name: string): string {
  const start = sql.indexOf(`create table ${name} (`);
  expect(start, name).toBeGreaterThan(-1);
  const end = sql.indexOf("create table ", start + 10);
  return end === -1 ? sql.slice(start) : sql.slice(start, end);
}
