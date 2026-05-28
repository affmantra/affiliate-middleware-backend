const app = require("./app");
const { connectDatabase } = require("./config/database");
const { env, validateServerEnvironment } = require("./config/env");

async function startServer() {
  validateServerEnvironment();
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`Backend server listening on port ${env.port}.`);
  });
}

startServer().catch((error) => {
  console.error("Unable to start backend server.", error);
  process.exit(1);
});
