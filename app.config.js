require('./scripts/load-env.cjs');

module.exports = {
  name: "G-Press",
  version: "1.0.0",
  platforms: ["ios", "android", "web"],
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_APP_ID,
    },
  },
};
