import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** שורש האפליקציה: כשיש `package.json`/`package-lock.json` בפרופיל (למשל `C:\\Users\\…\\`), ברירת המחדל של dev עם Turbopack פותר מודולים משם. `turbopack.root` לא מכסה את כל נתיבי ה־CSS; `next dev --webpack` מפעיל את ה־`webpack` למטה. */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // OpenNext על Cloudflare: אופטימיזציית תמונה דורשת התאמות; unoptimized נמנע תקלות IMAGES/loader.
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: projectRoot,
  },
  // כשיש `package-lock.json` בתיקיית הורה (למשל `C:\Users\vital\`), enhanced-resolve
  // לפעמים מתחיל מ־`OneDrive\Desktop` בלי `package.json` — ואז נבחר `C:\Users\vital\package.json`.
  // קיבוע context + node_modules לתיקיית האפליקציה מונע את שגיאת `@heroui/styles/css`.
  webpack: (config) => {
    config.context = projectRoot;
    config.resolve = config.resolve ?? {};
    config.resolve.modules = [
      path.join(projectRoot, "node_modules"),
      ...(Array.isArray(config.resolve.modules) ? config.resolve.modules : []),
    ];
    return config;
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
