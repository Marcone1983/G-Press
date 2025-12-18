require('./scripts/load-env.cjs');

module.exports = {
  name: "G-Press",
  version: "1.0.0",
  slug: "g-press",
  platforms: ["ios", "android", "web"],
  android: {
    package: "com.gpress.app",
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#ffffff"
    }
  },
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_APP_ID,
    },
  },
};
