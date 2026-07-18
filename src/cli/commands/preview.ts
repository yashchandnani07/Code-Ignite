import http from "http";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { ui } from "../ui";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

export async function handlePreview(portOption?: string): Promise<void> {
  const currentDir = process.cwd();
  const port = parseInt(portOption || "5000", 10);

  const indexFile = path.join(currentDir, "index.html");
  if (!fs.existsSync(indexFile)) {
    ui.printError(
      `Could not find "index.html" in the current directory: ${currentDir}. Make sure you run this command in your project folder.`,
    );
    return;
  }

  const server = http.createServer((req, res) => {
    // Resolve target file
    let reqPath = req.url || "/";
    // Strip query strings/hash
    reqPath = reqPath.split("?")[0].split("#")[0];

    if (reqPath === "/") {
      reqPath = "/index.html";
    }

    const resolvedCurrentDir = path.resolve(currentDir);
    const filePath = path.resolve(resolvedCurrentDir, "." + reqPath);

    // Security check: ensure resolved path is strictly inside currentDir.
    // Using path.sep prevents the sibling-directory bypass where a path like
    // "/project-secret/file" would pass a naive startsWith("/project") check.
    if (
      filePath !== resolvedCurrentDir &&
      !filePath.startsWith(resolvedCurrentDir + path.sep)
    ) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "text/plain");
      res.end("403 Forbidden");
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain");
        res.end("404 Not Found");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      res.statusCode = 200;
      res.setHeader("Content-Type", contentType);

      // Stream the file for performance and efficiency
      const stream = fs.createReadStream(filePath);
      stream.on("error", () => {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain");
        res.end("500 Internal Server Error");
      });
      stream.pipe(res);
    });
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    ui.printSuccess(
      `Local preview server running at: ${ui.colors.bold.cyan(url)}`,
    );
    ui.printInfo("Press Ctrl+C to stop the server.");

    // Auto-open browser
    let openCmd = "";
    switch (process.platform) {
      case "darwin":
        openCmd = "open";
        break;
      case "win32":
        openCmd = "start";
        break;
      default:
        openCmd = "xdg-open";
        break;
    }

    if (openCmd) {
      exec(`${openCmd} ${url}`, (err) => {
        if (err) {
          ui.printWarning(
            `Failed to open browser automatically: ${err.message}`,
          );
        }
      });
    }
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      ui.printError(
        `Port ${port} is already in use. Try running on a different port: codeignite preview --port ${port + 1}`,
      );
    } else {
      ui.printError(`Preview server error: ${err.message}`);
    }
  });
}
