import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoints FIRST
  app.get("/api/system-info", (req, res) => {
    res.json({
      status: "online",
      systemName: "Sistem Pemantauan Air Limbah Tambang & Kepatuhan Lingkungan",
      frameworks: [
        "Permen LHK No 6 Tahun 2021 (Limbah B3)",
        "Permen LHK No 113 Tahun 2003 (Air Limbah Batubara)",
        "Kepmen 344 Tahun 2025 (Reklamasi & Pascatambang)"
      ],
      lastUpdated: "2026-05-29",
      contact: "environmentdivakencanaborneo@gmail.com"
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  // Vite middleware for development / asset streaming
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // API/Assets 404 handler: if requesting a file with extension but not found in express.static
    app.use((req, res, next) => {
      if (req.path.includes(".")) {
        res.status(404).send("File not found");
      } else {
        next();
      }
    });

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Prod-Ready Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
