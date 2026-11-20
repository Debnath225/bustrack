module.exports = ({ config }) => {
  const android = { ...config.android };
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (mapsApiKey) {
    android.config = {
      ...android.config,
      googleMaps: {
        ...android.config?.googleMaps,
        apiKey: mapsApiKey,
      },
    };
  }

  return { ...config, android };
};
