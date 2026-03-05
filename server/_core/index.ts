import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { getProducts, getCategories } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy (needed for rate limiting behind reverse proxy / CDN)
  app.set("trust proxy", 1);

  // Security headers (helmet)
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled: Vite HMR and inline scripts need this off; tighten via CDN in prod
    crossOriginEmbedderPolicy: false,
  }));

  // Rate limiting — OTP/auth endpoints: 10 requests per 10 minutes per IP
  const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait 10 minutes before trying again." },
    skip: () => process.env.NODE_ENV === "test",
  });

  // General API rate limit: 300 requests per minute per IP
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
  });

  // Apply OTP limiter before body parser (path-based matching)
  app.use("/api/trpc/auth.sendOtp", otpLimiter);
  app.use("/api/trpc/auth.adminLogin", otpLimiter);
  app.use("/api/trpc/auth.adminVerifyOtp", otpLimiter);
  app.use("/api/trpc/auth.firebaseLogin", otpLimiter);

  // General API limiter
  app.use("/api/trpc", apiLimiter);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Dynamic sitemap.xml
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const [products, categories] = await Promise.all([
        getProducts({ limit: 500 }),
        getCategories(),
      ]);

      const staticUrls = [
        { loc: "/", priority: "1.0", changefreq: "daily" },
        { loc: "/shop", priority: "0.9", changefreq: "daily" },
        { loc: "/about", priority: "0.5", changefreq: "monthly" },
        { loc: "/contact", priority: "0.5", changefreq: "monthly" },
        { loc: "/flash-sales", priority: "0.8", changefreq: "hourly" },
      ];

      const categoryUrls = categories.map((c: { slug: string }) => ({
        loc: `/shop/category/${c.slug}`,
        priority: "0.7",
        changefreq: "weekly",
      }));

      const productUrls = products.products.map((p: { slug: string; updatedAt?: Date }) => ({
        loc: `/product/${p.slug}`,
        priority: "0.8",
        changefreq: "weekly",
        lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().split("T")[0] : undefined,
      }));

      const allUrls: Array<{ loc: string; priority: string; changefreq: string; lastmod?: string }> = [...staticUrls, ...categoryUrls, ...productUrls];

      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...allUrls.map(u => [
          '  <url>',
          `    <loc>${baseUrl}${u.loc}</loc>`,
          u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : '',
          `    <changefreq>${u.changefreq}</changefreq>`,
          `    <priority>${u.priority}</priority>`,
          '  </url>',
        ].filter(Boolean).join("\n")),
        '</urlset>',
      ].join("\n");

      res.set("Content-Type", "application/xml");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (err) {
      console.error("[Sitemap] Error generating sitemap:", err);
      res.status(500).send("Error generating sitemap");
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
