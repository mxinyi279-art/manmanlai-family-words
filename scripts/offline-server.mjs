import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const port = Number(process.env.PORT || 3100);
const host = "127.0.0.1";
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".wav": "audio/wav",
};

if (!existsSync(join(root, "index.html"))) {
  console.error("没有找到离线页面，请先生成 dist 文件夹。");
  process.exit(1);
}

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || "/", `http://${host}:${port}`).pathname);
  const relativePath = normalize(pathname).replace(/^([/\\])+/, "");
  let filePath = join(root, relativePath || "index.html");
  if (!filePath.startsWith(root) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(root, "index.html");
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  createReadStream(filePath).pipe(response);
}).listen(port, host, () => {
  console.log(`慢慢来离线版已启动：http://${host}:${port}/`);
  console.log("请保持这个窗口打开；练习结束后可以直接关闭窗口。");
});
