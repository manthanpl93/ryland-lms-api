module.exports = {
  apps: [
    {
      name: "XTCare_LMS_API",
      exec_mode: "cluster",
      instances: 1, // Or a number of instances
      script: "lib/",
      args: "start",
      // pre_start: "rm -rf lib && tsc",
      env_production: {
        NODE_ENV: "production",
      },
      env_staging: {
        NODE_ENV: "staging",
      },
    },
  ],
};
