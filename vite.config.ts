import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { assertPublicKey } from "./src/lib/security";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  if (env.VITE_SUPABASE_ANON_KEY) assertPublicKey(env.VITE_SUPABASE_ANON_KEY);
  if (Boolean(env.VITE_SUPABASE_URL) !== Boolean(env.VITE_SUPABASE_ANON_KEY))
    throw new Error(
      "Preencha as duas variáveis do Supabase ou deixe ambas vazias para demonstração.",
    );
  return {
    plugins: [react()],
    server: {
      headers: {
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    },
  };
});
