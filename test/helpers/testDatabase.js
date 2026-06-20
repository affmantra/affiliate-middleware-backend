const mongoose = require("mongoose");

async function connectTestDatabase() {
  if (!process.env.MONGODB_TEST_URI) {
    throw new Error("MONGODB_TEST_URI is required for database integration tests.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(process.env.MONGODB_TEST_URI);
  return mongoose.connection;
}

async function clearTestDatabase() {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

async function disconnectTestDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
};
