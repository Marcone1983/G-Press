const env = require('./scripts/load-env.js');

module.exports = {
  name: "G-Press",
  version: "1.0.0",
  extra: {
    ...env,
  },
};