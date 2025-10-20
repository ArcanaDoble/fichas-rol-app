const path = require('path');

module.exports = {
  webpack: {
    alias: {
      'react-reconciler/constants$': path.resolve(
        __dirname,
        'node_modules/react-reconciler/constants.js'
      ),
    },
    configure: (config) => {
      config.resolve = config.resolve || {};
      config.resolve.fullySpecified = false;
      return config;
    },
  },
};
