const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, shell } = require("electron");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

let staticServer;

function getStaticRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "out");
  }

  return path.join(app.getAppPath(), "out");
}

function normaliseRequestPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const candidate = cleanPath === "/" ? "/index.html" : cleanPath;

  if (path.extname(candidate)) {
    return candidate;
  }

  return candidate.endsWith("/")
    ? `${candidate}index.html`
    : `${candidate}/index.html`;
}

function sendFile(staticRoot, requestPath, response) {
  const filePath = path.normalize(path.join(staticRoot, requestPath));

  if (!filePath.startsWith(staticRoot)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type":
        MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream",
    });
    fs.createReadStream(filePath).pipe(response);
  });
}

async function startStaticServer() {
  const staticRoot = getStaticRoot();

  staticServer = http.createServer((request, response) => {
    const requestPath = normaliseRequestPath(request.url ?? "/");
    sendFile(staticRoot, requestPath, response);
  });

  await new Promise((resolve) => {
    staticServer.listen(0, "127.0.0.1", resolve);
  });

  const address = staticServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to determine the local static server address.");
  }

  return `http://127.0.0.1:${address.port}/`;
}

async function createWindow() {
  const startUrl = await startStaticServer();
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    autoHideMenuBar: true,
    backgroundColor: "#f4efe6",
    title: "The Devil's AI Dictionary",
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(startUrl)) {
      return;
    }

    event.preventDefault();
    shell.openExternal(url);
  });

  await window.loadURL(startUrl);
}

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  if (staticServer) {
    staticServer.close();
  }
});
