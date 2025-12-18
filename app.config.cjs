const loadEnv = require('./scripts/load-env.cjs');

module.exports = {
  name: "G-Press",
  slug: "g-press",
  version: "1.0.0",
  platforms: ["android", "ios", "web"],
  extra: {
    ...loadEnv,
  },
};