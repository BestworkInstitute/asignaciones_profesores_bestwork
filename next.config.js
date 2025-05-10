// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        child_process: false,
        os: false,
        path: false,
        crypto: false,
        http: false,
        https: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};
