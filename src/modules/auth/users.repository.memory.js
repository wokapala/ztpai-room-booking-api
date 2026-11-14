function createUsersRepository(state) {
  let nextId = Math.max(0, ...state.users.map(u => u.id)) + 1;

  return {
    async findById(id) {
      return state.users.find(u => u.id === id) ?? null;
    },
    async findByEmail(email) {
      return state.users.find(u => u.email === email) ?? null;
    },
    async create({ email, passwordHash, role }) {
      if (state.users.some(u => u.email === email)) {
        throw Object.assign(new Error("duplicate email"), { code: "23505", constraint: "users_email_unique" });
      }
      const user = { id: nextId++, email, passwordHash, role, createdAt: new Date() };
      state.users.push(user);
      return user;
    }
  };
}

module.exports = { createUsersRepository };
