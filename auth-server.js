const express = require("express");
const multer = require("multer");
const basicAuth = require("express-basic-auth");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const rootDir = __dirname;
const basePort = Number(process.env.PORT || 8080);
const host = String(process.env.HOST || "127.0.0.1");
const authUser = process.env.AUTH_USER;
const authPass = process.env.AUTH_PASS;
const explicitLocalBypassAuth = ["1", "true", "yes"].includes(String(process.env.LOCAL_BYPASS_AUTH || "").toLowerCase());
const loopbackHosts = ["127.0.0.1", "::1", "localhost"];
const isLoopbackHost = loopbackHosts.includes(String(host).toLowerCase());
const missingAuthEnv = !authUser || !authPass;
const localBypassAuth = explicitLocalBypassAuth || (missingAuthEnv && isLoopbackHost);
const remoteSyncUrl = String(process.env.REMOTE_SYNC_URL || "").trim().replace(/\/$/, "");
const remoteSyncUser = String(process.env.REMOTE_SYNC_AUTH_USER || authUser || "");
const remoteSyncPass = String(process.env.REMOTE_SYNC_AUTH_PASS || authPass || "");
const uploadsRoot = path.join(rootDir, "uploads", "client-files");
const sharedStatePath = path.join(rootDir, "uploads", "shared-state.json");
const maxFileSizeMb = Number(process.env.MAX_UPLOAD_MB || 50);
const trustProxy = String(process.env.TRUST_PROXY || "0");
const apiRateLimitWindowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const apiRateLimitMax = Number(process.env.API_RATE_LIMIT_MAX || 300);

if (missingAuthEnv && !localBypassAuth) {
  console.error("Missing AUTH_USER or AUTH_PASS environment variables.");
  console.error("PowerShell example:");
  console.error("$env:AUTH_USER='demo'; $env:AUTH_PASS='strong-password'; npm run serve:auth");
  console.error("For local-only preview without credentials use HOST=127.0.0.1 or LOCAL_BYPASS_AUTH=true.");
  process.exit(1);
}

fs.mkdirSync(uploadsRoot, { recursive: true });

function readSharedState() {
  try {
    if (!fs.existsSync(sharedStatePath)) {
      return {};
    }

    const raw = fs.readFileSync(sharedStatePath, "utf8");
    if (!raw.trim()) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.error("Failed to read shared state:", error);
    return {};
  }
}

function writeSharedState(state) {
  const tempPath = `${sharedStatePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tempPath, sharedStatePath);
}

function normalizeSharedStateKey(value) {
  const key = String(value || "").trim();
  if (!key || key.length > 200 || /[\x00-\x1F]/.test(key)) {
    return "";
  }
  return key;
}

function isLoopbackRequest(req) {
  const ip = String(req.ip || req.socket?.remoteAddress || "");
  const forwardedFor = String(req.headers["x-forwarded-for"] || "");
  return ip === "127.0.0.1"
    || ip === "::1"
    || ip === "::ffff:127.0.0.1"
    || forwardedFor === "127.0.0.1"
    || forwardedFor === "::1";
}

function canUseRemoteSync() {
  return Boolean(remoteSyncUrl && remoteSyncUser && remoteSyncPass);
}

function getRemoteAuthHeader() {
  return `Basic ${Buffer.from(`${remoteSyncUser}:${remoteSyncPass}`).toString("base64")}`;
}

async function proxyRemoteJson(endpoint, options = {}) {
  const response = await fetch(`${remoteSyncUrl}${endpoint}`, {
    redirect: "manual",
    ...options,
    headers: {
      Authorization: getRemoteAuthHeader(),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {}

  return { response, text, json };
}

async function proxyRemoteDownload(endpoint) {
  const response = await fetch(`${remoteSyncUrl}${endpoint}`, {
    headers: {
      Authorization: getRemoteAuthHeader(),
    },
    redirect: "manual",
  });

  const arrayBuffer = await response.arrayBuffer();
  return { response, buffer: Buffer.from(arrayBuffer) };
}

async function mirrorUploadToRemote(company, folder, files) {
  if (!canUseRemoteSync() || !Array.isArray(files) || !files.length) {
    return null;
  }

  const form = new FormData();
  form.set("company", company);
  form.set("folder", folder);

  files.forEach((file) => {
    const fileBuffer = fs.readFileSync(file.path);
    const blob = new Blob([fileBuffer], { type: file.mimetype || "application/octet-stream" });
    form.append("files", blob, normalizeUploadedFilename(file.originalname || path.basename(file.path)));
  });

  const response = await fetch(`${remoteSyncUrl}/api/client-files`, {
    method: "POST",
    headers: {
      Authorization: getRemoteAuthHeader(),
    },
    body: form,
    redirect: "manual",
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {}
  return { response, text, json };
}

function safeSegment(value, fallback) {
  const normalized = String(value || "").trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 120);
  return normalized || fallback;
}

function safeFilename(value) {
  return safeSegment(value, "file").replace(/\s+/g, " ");
}

function decodeMojibakeFilename(value) {
  const input = String(value || "");
  if (!input) return input;

  try {
    const decoded = Buffer.from(input, "latin1").toString("utf8");
    const looksMojibake = /[ÐÑÃ]/.test(input);
    const hasCyrillic = /[\u0400-\u04FF]/.test(decoded);
    if (looksMojibake && hasCyrillic) {
      return decoded;
    }
  } catch (error) {}

  return input;
}

function normalizeUploadedFilename(value) {
  return safeFilename(decodeMojibakeFilename(value));
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
  const originalNameRaw = parts.slice(1).join("__") || filename;
  const originalName = decodeMojibakeFilename(originalNameRaw);

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
    callback(null, `${id}__${normalizeUploadedFilename(file.originalname)}`);
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

app.use((req, res, next) => {
  if (localBypassAuth && isLoopbackRequest(req)) {
    next();
    return;
  }

  if (!authUser || !authPass) {
    res.status(401).send("Authentication required.");
    return;
  }

  return basicAuth({
    users: { [authUser]: authPass },
    challenge: true,
    realm: "CLOTO Preview",
    unauthorizedResponse: "Authentication required.",
  })(req, res, next);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    uploads: true,
    sharedState: true,
    maxFileSizeMb,
  });
});

app.get("/api/shared-state", (req, res) => {
  if (canUseRemoteSync()) {
    proxyRemoteJson("/api/shared-state")
      .then(({ response, json }) => {
        if (!response.ok || !json || typeof json.items !== "object") {
          res.status(response.status || 502).json(json || { error: "Remote shared state is unavailable" });
          return;
        }
        writeSharedState(json.items);
        res.json({ items: json.items });
      })
      .catch(() => {
        res.json({ items: readSharedState() });
      });
    return;
  }

  res.json({ items: readSharedState() });
});

app.put("/api/shared-state/:key", (req, res) => {
  const key = normalizeSharedStateKey(req.params.key);
  if (!key) {
    res.status(400).json({ error: "Invalid shared state key" });
    return;
  }

  const state = readSharedState();
  state[key] = String(req.body && req.body.value != null ? req.body.value : "");
  writeSharedState(state);

  if (canUseRemoteSync()) {
    proxyRemoteJson(`/api/shared-state/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: state[key] }),
    })
      .then(({ response, json }) => {
        res.status(response.ok ? 200 : response.status).json(json || { ok: response.ok, key });
      })
      .catch(() => {
        res.json({ ok: true, key, localOnly: true });
      });
    return;
  }

  res.json({ ok: true, key });
});

app.delete("/api/shared-state/:key", (req, res) => {
  const key = normalizeSharedStateKey(req.params.key);
  if (!key) {
    res.status(400).json({ error: "Invalid shared state key" });
    return;
  }

  const state = readSharedState();
  delete state[key];
  writeSharedState(state);

  if (canUseRemoteSync()) {
    proxyRemoteJson(`/api/shared-state/${encodeURIComponent(key)}`, {
      method: "DELETE",
    })
      .then(({ response, json }) => {
        res.status(response.ok ? 200 : response.status).json(json || { ok: response.ok, key });
      })
      .catch(() => {
        res.json({ ok: true, key, localOnly: true });
      });
    return;
  }

  res.json({ ok: true, key });
});

app.get("/api/client-files", (req, res) => {
  const company = String(req.query.company || "").trim();
  const folder = String(req.query.folder || "").trim();

  if (!company || !folder) {
    res.status(400).json({ error: "company and folder are required" });
    return;
  }

  if (canUseRemoteSync()) {
    proxyRemoteJson(`/api/client-files?company=${encodeURIComponent(company)}&folder=${encodeURIComponent(folder)}`)
      .then(({ response, json }) => {
        if (!response.ok) {
          res.status(response.status).json(json || { error: "Remote files API is unavailable" });
          return;
        }
        res.json(json || { files: [] });
      })
      .catch(() => {
        res.json({ files: listFiles(company, folder) });
      });
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

  if (canUseRemoteSync()) {
    mirrorUploadToRemote(company, folder, req.files)
      .then((result) => {
        if (!result) {
          res.status(201).json({ files: listFiles(company, folder) });
          return;
        }

        if (!result.response.ok) {
          res.status(result.response.status).json(result.json || { error: "Remote upload failed" });
          return;
        }

        res.status(201).json(result.json || { files: listFiles(company, folder) });
      })
      .catch(() => {
        res.status(201).json({ files: listFiles(company, folder), localOnly: true });
      });
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

  if (canUseRemoteSync()) {
    proxyRemoteDownload(`/api/client-files/${encodeURIComponent(fileId)}/download?company=${encodeURIComponent(company)}&folder=${encodeURIComponent(folder)}`)
      .then(({ response, buffer }) => {
        if (!response.ok) {
          res.status(response.status).send("Not found.");
          return;
        }
        const contentType = response.headers.get("content-type");
        const contentDisposition = response.headers.get("content-disposition");
        if (contentType) res.setHeader("Content-Type", contentType);
        if (contentDisposition) res.setHeader("Content-Disposition", contentDisposition);
        res.send(buffer);
      })
      .catch(() => {
        res.status(502).send("Remote download is unavailable.");
      });
    return;
  }

  const stored = findStoredFile(company, folder, fileId);
  if (!stored) {
    res.status(404).send("Not found.");
    return;
  }

  const originalNameRaw = stored.filename.split("__").slice(1).join("__") || stored.filename;
  const originalName = decodeMojibakeFilename(originalNameRaw);
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

  if (canUseRemoteSync()) {
    proxyRemoteJson(`/api/client-files/${encodeURIComponent(fileId)}?company=${encodeURIComponent(company)}&folder=${encodeURIComponent(folder)}`, {
      method: "DELETE",
    })
      .then(({ response, json }) => {
        if (!response.ok) {
          res.status(response.status).json(json || { error: "Remote delete failed" });
          return;
        }
        res.json(json || { ok: true });
      })
      .catch(() => {
        res.status(502).json({ error: "Remote delete is unavailable" });
      });
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

app.use(function(req, res, next) {
  if (/\.html?$/i.test(req.path) || req.path === '/' || !req.path.includes('.')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
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

function printStartupInfo(activePort) {
  console.log(`Protected preview is running at http://${host}:${activePort}`);
  console.log(`Authenticated upload API is available at http://${host}:${activePort}/api/client-files`);
  console.log(`API rate limit: ${apiRateLimitMax} requests per ${Math.round(apiRateLimitWindowMs / 60000)} minute(s)`);
  if (localBypassAuth && missingAuthEnv) {
    console.log("AUTH_USER/AUTH_PASS are not set. Local loopback requests are allowed without Basic Auth.");
  }
  if (localBypassAuth) {
    console.log("Local loopback auth bypass is enabled.");
  }
  if (canUseRemoteSync()) {
    console.log(`Remote sync is enabled for ${remoteSyncUrl}`);
  }
}

function startServer(portToTry, attemptsLeft) {
  const server = app.listen(portToTry, host, () => {
    printStartupInfo(portToTry);
  });

  server.on("error", (error) => {
    if (error && error.code === "EADDRINUSE" && attemptsLeft > 0) {
      const nextPort = portToTry + 1;
      console.warn(`Port ${portToTry} is busy. Retrying on ${nextPort}...`);
      startServer(nextPort, attemptsLeft - 1);
      return;
    }

    console.error("Failed to start server:", error && error.message ? error.message : error);
    process.exit(1);
  });
}

startServer(basePort, 20);