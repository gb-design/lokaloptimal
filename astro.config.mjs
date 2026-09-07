import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://www.lokaloptimal.at",
  adapter: vercel(),
  integrations: [
    react(),
    // Das Dashboard ist bereits per robots.txt, Meta-Tag und X-Robots-Tag
    // ausgeschlossen; der Filter ist die vierte Absicherung.
    sitemap({ filter: (page) => !page.includes("/dashboard") }),
  ],
  devToolbar: {
    enabled: false,
  },
  vite: {
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client"],
    },
    plugins: [tailwindcss()],
  },
});
