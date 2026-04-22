import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const rootPkg = JSON.parse(
  readFileSync(join(__dirname, "../../package.json"), "utf-8"),
) as { version?: string };

const appVersion = rootPkg.version || "0.0.0";
const apiProxyTarget = process.env.API_URL || "http://127.0.0.1:3001";

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: "./src/main.tsx",
    },
    alias: {
      "@": __dirname,
      "@neko-master/shared": join(__dirname, "../../packages/shared/src/index.ts"),
      "next-intl": join(__dirname, "compat/next-intl.tsx"),
      "next/navigation": join(__dirname, "compat/next-navigation.ts"),
      "next/image": join(__dirname, "compat/next-image.tsx"),
    },
    define: {
      "process.env.NEXT_PUBLIC_APP_VERSION": JSON.stringify(appVersion),
      "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(
        process.env.NEXT_PUBLIC_API_URL || "",
      ),
      "process.env.NEXT_PUBLIC_WS_PORT": JSON.stringify(
        process.env.NEXT_PUBLIC_WS_PORT || "3002",
      ),
      "process.env.NEXT_PUBLIC_WS_URL": JSON.stringify(
        process.env.NEXT_PUBLIC_WS_URL || "",
      ),
      "process.env.NEXT_PUBLIC_GITHUB_REPO": JSON.stringify(
        process.env.NEXT_PUBLIC_GITHUB_REPO || "foru17/neko-master",
      ),
      "process.env.API_URL": JSON.stringify(process.env.API_URL || ""),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": apiProxyTarget,
      "/_cm_ws": {
        target: "ws://127.0.0.1:3002",
        ws: true,
      },
    },
  },
  output: {
    copy: [
      {
        from: "./public",
      },
    ],
  },
  html: {
    title: "Neko Master",
    tags: [
      {
        tag: "meta",
        attrs: {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
        },
        head: true,
      },
      {
        tag: "meta",
        attrs: {
          name: "description",
          content: "Modern traffic analytics for edge gateways",
        },
        head: true,
      },
      {
        tag: "meta",
        attrs: {
          name: "application-name",
          content: "Neko Master",
        },
        head: true,
      },
      {
        tag: "meta",
        attrs: {
          name: "apple-mobile-web-app-capable",
          content: "yes",
        },
        head: true,
      },
      {
        tag: "meta",
        attrs: {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        head: true,
      },
      {
        tag: "meta",
        attrs: {
          name: "apple-mobile-web-app-title",
          content: "Neko Master",
        },
        head: true,
      },
      {
        tag: "meta",
        attrs: {
          name: "theme-color",
          content: "#F5F7FA",
        },
        head: true,
      },
      {
        tag: "link",
        attrs: {
          rel: "icon",
          href: "/logo.png",
        },
        head: true,
      },
      {
        tag: "link",
        attrs: {
          rel: "apple-touch-icon",
          href: "/icons/icon-192x192.png",
        },
        head: true,
      },
      {
        tag: "link",
        attrs: {
          rel: "manifest",
          href: "/manifest.webmanifest",
        },
        head: true,
      },
      {
        tag: "script",
        attrs: {
          src: "/runtime-config.js",
        },
        head: true,
      },
    ],
  },
});
