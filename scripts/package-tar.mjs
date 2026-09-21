import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const manifest = JSON.parse(readFileSync(resolve(root, "theme.json"), "utf8"));
const shortName = manifest.short || "sao";
const version = manifest.version || "1.0.0";

const distDir = resolve(root, "dist");
const previewPath = resolve(root, "preview.png");
const themeJsonPath = resolve(root, "theme.json");

if (!existsSync(distDir)) {
  console.error("package-tar: dist/ 目录不存在，请先运行 `npm run build`。");
  process.exit(1);
}

if (!existsSync(themeJsonPath)) {
  console.error("package-tar: theme.json 不存在。");
  process.exit(1);
}

const tarGzName = "theme.tar.gz";
const namedTarGzName = `${shortName}-theme-v${version}.tar.gz`;

console.log(`正在打包 Monitor 主题: ${manifest.name} (${shortName})...`);

// 按照 Monitor 规范打包：顶层包含 theme.json, preview.png, dist/
const filesToPack = ["theme.json", "dist"];
if (existsSync(previewPath)) {
  filesToPack.push("preview.png");
}

try {
  // 生成标准 theme.tar.gz (支持直接拖拽进 Monitor 面板)
  execSync(`tar -czf "${tarGzName}" ${filesToPack.map((f) => `"${f}"`).join(" ")}`, {
    cwd: root,
    stdio: "inherit",
  });

  // 同时也保留一份带版本号命名的归档
  execSync(`cp "${tarGzName}" "${namedTarGzName}"`, {
    cwd: root,
    stdio: "inherit",
  });

  console.log(`✅ 打包成功:`);
  console.log(`   - ${tarGzName} (可直接拖拽上传至 Monitor 面板)`);
  console.log(`   - ${namedTarGzName}`);
} catch (err) {
  console.error("打包失败:", err);
  process.exit(1);
}
