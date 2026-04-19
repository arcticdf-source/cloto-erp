const express = require("express");
const multer = require("multer");
const basicAuth = require("express-basic-auth");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const rootDir = __dirname;
const port = Number(process.env.PORT || 8080);
const host = String(process.env.HOST || "127.0.0.1");
const authUser = process.env.AUTH_USER;
const authPass = process.env.AUTH_PASS;
const uploadsRoot = path.join(rootDir, "uploads", "client-files");
const maxFileSizeMb = Number(process.env.MAX_UPLOAD_MB || 50);
const trustProxy = String(process.env.TRUST_PROXY || "0");
const apiRateLimitWindowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const apiRateLimitMax = Number(process.env.API_RATE_LIMIT_MAX || 300);

if (!authUser || !authPass) {
  console.error("Missing AUTH_USER or AUTH_PASS environment variables.");
  console.error("PowerShell example:");
  console.error("$env:AUTH_USER='demo'; $env:AUTH_PASS='strong-password'; npm run serve:auth");
  process.exit(1);
}

fs.mkdirSync(uploadsRoot, { recursive: true });

function safeSegment(value, fallback) {
  const normalized = String(value || "").trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 120);
  return normalized || fallback;
}

function safeFilename(value) {
  return safeSegment(value, "file").replace(/\s+/g, " ");
}

function getFolderPath(company, folder) {
  return path.join(
    uploadsRoot,
    safeSegment(company, "default-client"),
    safeSegment(folder, "files")
  );
}

function getFileMeta(company, folder, filename, stats) {
  const parts = String(filename).split("__");
  const id = parts[0] || filename;
  const originalName = parts.slice(1).join("__") || filename;

  return {
    id,
    name: originalName,
    size: stats.size,
    type: path.extname(originalName).slice(1).toLowerCase(),
    savedAt: stats.mtime.toISOString(),
    downloadUrl: `/api/client-files/${encodeURIComponent(id)}/download?company=${encodeURIComponent(company)}&folder=${encodeURIComponent(folder)}`,
  };
}

function listFiles(company, folder) {
  const folderPath = getFolderPath(company, folder);
  if (!fs.existsSync(folderPath)) {
    return [];
  }

  return fs.readdirSync(folderPath)
    .map((filename) => {
      const filePath = path.join(folderPath, filename);
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        return null;
      }
      return getFileMeta(company, folder, filename, stats);
    })
    .filter(Boolean)
    .sort((left, right) => String(right.savedAt).localeCompare(String(left.savedAt)));
}

function findStoredFile(company, folder, fileId) {
  const folderPath = getFolderPath(company, folder);
  if (!fs.existsSync(folderPath)) {
    return null;
  }

  const target = fs.readdirSync(folderPath).find((filename) => filename.startsWith(`${fileId}__`) || filename === fileId);
  if (!target) {
    return null;
  }

  return {
    folderPath,
    filename: target,
    filePath: path.join(folderPath, target),
  };
}

const storage = multer.diskStorage({
  destination(req, file, callback) {
    const company = req.body.company;
    const folder = req.body.folder;
    if (!company || !folder) {
      callback(new Error("Missing company or folder."));
      return;
    }

    const targetDir = getFolderPath(company, folder);
    fs.mkdirSync(targetDir, { recursive: true });
    callback(null, targetDir);
  },
  filename(req, file, callback) {
    const id = crypto.randomUUID();
    callback(null, `${id}__${safeFilename(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSizeMb * 1024 * 1024,
    files: 20,
  },
});

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", trustProxy === "1" || trustProxy.toLowerCase() === "true" ? 1 : trustProxy);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

const apiLimiter = rateLimit({
  windowMs: apiRateLimitWindowMs,
  limit: apiRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many API requests. Try again later." },
});

app.use(
  basicAuth({
    users: { [authUser]: authPass },
    challenge: true,
    realm: "CLOTO Preview",
    unauthorizedResponse: "Authentication required.",
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    uploads: true,
    maxFileSizeMb,
  });
});

app.get("/api/client-files", (req, res) => {
  const company = String(req.query.company || "").trim();
  const folder = String(req.query.folder || "").trim();

  if (!company || !folder) {
    res.status(400).json({ error: "company and folder are required" });
    return;
  }

  res.json({ files: listFiles(company, folder) });
});

app.post("/api/client-files", upload.array("files", 20), (req, res) => {
  const company = String(req.body.company || "").trim();
  const folder = String(req.body.folder || "").trim();

  if (!company || !folder) {
    res.status(400).json({ error: "company and folder are required" });
    return;
  }

  const files = listFiles(company, folder);
  res.status(201).json({ files });
});

app.get("/api/client-files/:id/download", (req, res) => {
  const company = String(req.query.company || "").trim();
  const folder = String(req.query.folder || "").trim();
  const fileId = String(req.params.id || "").trim();

  if (!company || !folder || !fileId) {
    res.status(400).send("company, folder and id are required");
    return;
  }

  const stored = findStoredFile(company, folder, fileId);
  if (!stored) {
    res.status(404).send("Not found.");
    return;
  }

  const originalName = stored.filename.split("__").slice(1).join("__") || stored.filename;
  res.download(stored.filePath, originalName);
});

app.delete("/api/client-files/:id", (req, res) => {
  const company = String(req.query.company || "").trim();
  const folder = String(req.query.folder || "").trim();
  const fileId = String(req.params.id || "").trim();

  if (!company || !folder || !fileId) {
    res.status(400).json({ error: "company, folder and id are required" });
    return;
  }

  const stored = findStoredFile(company, folder, fileId);
  if (!stored) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  fs.unlinkSync(stored.filePath);
  res.json({ ok: true, files: listFiles(company, folder) });
});

app.use(
  express.static(rootDir, {
    extensions: ["html"],
    redirect: false,
  })
);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error) {
    res.status(500).json({ error: error.message || "Unexpected server error" });
    return;
  }
  next();
});

app.use((req, res) => {
  res.status(404).type("text/plain; charset=utf-8").send("Not found.");
});

app.listen(port, host, () => {
  console.log(`Protected preview is running at http://${host}:${port}`);
  console.log(`Authenticated upload API is available at http://${host}:${port}/api/client-files`);
  console.log(`API rate limit: ${apiRateLimitMax} requests per ${Math.round(apiRateLimitWindowMs / 60000)} minute(s)`);
});