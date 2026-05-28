const bcrypt = require("bcrypt");

const PASSWORD_SALT_ROUNDS = 12;

async function hashPassword(password) {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

module.exports = { comparePassword, hashPassword };
