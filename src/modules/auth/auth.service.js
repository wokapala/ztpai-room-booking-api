const { randomBytes } = require("node:crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ConflictError, NotFoundError, UnauthorizedError } = require("../../errors/AppError");

const BCRYPT_ROUNDS = 12;
// porównanie dla nieistniejącego emaila trwa tyle samo, co dla istniejącego
const DUMMY_HASH = bcrypt.hashSync(randomBytes(32).toString("hex"), BCRYPT_ROUNDS);

function createAuthService({ runInTransaction, jwtSecret, jwtExpiresIn }) {
  async function register({ email, password }) {
    const existing = await runInTransaction(({ usersRepository }) => usersRepository.findByEmail(email));
    if (existing) throw new ConflictError("Email already registered", "EMAIL_TAKEN");

    // bcrypt poza transakcją, żeby nie trzymać połączenia z bazą podczas liczenia hasha.
    // Przy równoległej rejestracji chroni UNIQUE na users.email (23505 -> 409 EMAIL_TAKEN).
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return runInTransaction(({ usersRepository }) =>
      usersRepository.create({ email, passwordHash, role: "USER" })
    );
  }

  async function login({ email, password }) {
    const user = await runInTransaction(({ usersRepository }) => usersRepository.findByEmail(email));
    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordOk) throw new UnauthorizedError("Invalid email or password");

    const accessToken = jwt.sign(
      { role: user.role },
      jwtSecret,
      { subject: String(user.id), expiresIn: jwtExpiresIn, algorithm: "HS256" }
    );
    return { accessToken, tokenType: "Bearer", expiresIn: jwtExpiresIn };
  }

  async function getCurrentUser(currentUser) {
    return runInTransaction(async ({ usersRepository }) => {
      const user = await usersRepository.findById(currentUser.id);
      if (!user) throw new NotFoundError("User");
      return user;
    });
  }

  return { register, login, getCurrentUser };
}

module.exports = { createAuthService };
