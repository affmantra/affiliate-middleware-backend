module.exports = {
  clearMocks: true,
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/server.js",
    "!src/workers/**",
  ],
  coverageDirectory: "coverage",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/test/",
  ],
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.test.js"],
  verbose: true,
};
