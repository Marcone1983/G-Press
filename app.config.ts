import './scripts/load-env.js';

export default {
  name: "G-Press",
  version: "1.0.0",
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_APP_ID,
    },
  },
};