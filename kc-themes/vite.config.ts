import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { keycloakify } from "keycloakify/vite-plugin";

// https://vite.dev/config/
// Login theme only — this app doesn't customize the Account or Admin
// console UIs, so no accountThemeImplementation/adminThemeImplementation
// is configured.
export default defineConfig({
  plugins: [
    react(),
    keycloakify({
      accountThemeImplementation: "none",
    }),
  ],
});
