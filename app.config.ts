const loadEnv = async () => {
  const env = await import('./scripts/load-env.js').then(module => module.default || module);
  return {
    name: "G-Press",
    version: "1.0.0",
    extra: {
      ...env,
    },
  };
};

export default loadEnv;
