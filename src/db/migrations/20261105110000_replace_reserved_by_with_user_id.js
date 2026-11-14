const POLISH = { ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" };

function toEmail(name, taken) {
  const slug = name.toLowerCase()
    .replace(/[ąćęłńóśźż]/g, c => POLISH[c])
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "") || "user";

  let email = `${slug}@migrated.invalid`;
  for (let i = 2; taken.has(email); i++) email = `${slug}.${i}@migrated.invalid`;
  taken.add(email);
  return email;
}

exports.up = async function (knex) {
  // 1. kolumna nullable - w tabeli mogą już być wiersze
  await knex.schema.alterTable("reservations", table => {
    table.integer("user_id").references("id").inTable("users").onDelete("RESTRICT");
  });

  // 2. backfill: każda osoba z reserved_by dostaje własne konto.
  // Hash "!" to nie jest poprawny hash bcrypt, więc na takie konto nie da się zalogować.
  const taken = new Set((await knex("users").select("email")).map(u => u.email));
  const people = await knex("reservations").distinct("reserved_by");
  for (const { reserved_by: name } of people) {
    const [user] = await knex("users")
      .insert({ email: toEmail(name, taken), password_hash: "!", role: "USER" })
      .returning("id");
    await knex("reservations").where({ reserved_by: name }).update({ user_id: user.id });
  }

  // 3. dopiero po uzupełnieniu danych NOT NULL i usunięcie starej kolumny
  await knex.schema.alterTable("reservations", table => {
    table.dropNullable("user_id");
    table.dropColumn("reserved_by");
    table.index(["user_id"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("reservations", table => {
    table.string("reserved_by", 100);
  });
  // oryginalnych nazw już nie ma - najbliższa dostępna informacja to email
  await knex.raw("UPDATE reservations r SET reserved_by = left(u.email, 100) FROM users u WHERE u.id = r.user_id");
  await knex.schema.alterTable("reservations", table => {
    table.dropNullable("reserved_by");
    table.dropIndex(["user_id"]);
    table.dropColumn("user_id");
  });
};
