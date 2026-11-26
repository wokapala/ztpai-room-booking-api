exports.up = async function (knex) {
  await knex.schema.createTable("audit_log", table => {
    table.bigIncrements("id").primary();
    table.string("event_type", 100).notNullable();
    // różne eventy mają różne pola, więc cały payload trzymamy jako jsonb
    table.jsonb("payload").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable();
    table.index(["event_type", "created_at"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTable("audit_log");
};
