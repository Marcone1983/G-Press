const loadEnv = require('./scripts/load-env.cjs');

export default {
  name: "G-Press",
  slug: "g-press",
  version: "1.0.0",
  platforms: ["android", "ios", "web"],
  extra: {
    ...loadEnv,
  },
};