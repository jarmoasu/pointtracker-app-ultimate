const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// withRorkMetro is only needed for the Rork dev environment. Skipping it
// during EAS cloud builds avoids a metro-cache exports mismatch with Expo SDK 51.
if (!process.env.EAS_BUILD) {
  try {
    const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");
    module.exports = withRorkMetro(config);
  } catch {
    module.exports = config;
  }
} else {
  module.exports = config;
}
