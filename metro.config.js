const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Limit the number of workers to reduce memory pressure during bundling.
// This helps prevent SIGTERM crashes in resource-constrained environments.
config.maxWorkers = 2;

module.exports = config;
