import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";

const envDir = fileURLToPath(new URL("../", import.meta.url));
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, "");
  return {
    envDir,
    server: {
      proxy: {
        "/api": {
          target:
            env.API_PROXY_TARGET || `http://localhost:${env.PORT || 3001}`,
          changeOrigin: true,
        },
      },
    },
  };
});
