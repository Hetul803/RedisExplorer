import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";

const envDir = fileURLToPath(new URL("../", import.meta.url));
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, "");
  const port = Number(env.VITE_PORT);
  if (mode === "development" && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    throw new Error("VITE_PORT must be set to a valid port in the root .env file");
  }
  if (mode === "development" && !env.API_PROXY_TARGET) {
    throw new Error("API_PROXY_TARGET must be set in the root .env file");
  }
  return {
    envDir,
    server: {
      ...(mode === "development" ? { port, strictPort: true } : {}),
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET,
          changeOrigin: true,
        },
      },
    },
  };
});
