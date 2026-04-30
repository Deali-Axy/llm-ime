import { access, mkdir, rename, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const MODEL_REPO = "unsloth/Qwen3-0.6B-GGUF";
const MODEL_FILE = "Qwen3-0.6B-IQ4_XS.gguf";
const DOWNLOAD_URL = new URL(
  `https://www.modelscope.cn/api/v1/models/${MODEL_REPO}/repo`,
);

DOWNLOAD_URL.searchParams.set("Revision", "master");
DOWNLOAD_URL.searchParams.set("FilePath", MODEL_FILE);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const defaultOutputPath = path.resolve(repoRoot, "..", "Qwen3-0.6B-GGUF", MODEL_FILE);

function printHelp() {
  console.log(`用法:
  pnpm run model:download
  pnpm run model:download -- <输出文件路径>
  pnpm run model:download -- --force

说明:
  - 默认下载到与本仓库同级的 Qwen3-0.6B-GGUF\\${MODEL_FILE}
  - 只下载本项目所需的单个 GGUF 文件，不下载完整模型仓库
  - 如目标文件已存在，默认跳过；加 --force 可覆盖重下`);
}

function parseArgs(args) {
  let force = false;
  let outputPath = defaultOutputPath;

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--force") {
      force = true;
      continue;
    }

    outputPath = path.resolve(process.cwd(), arg);
  }

  return {
    force,
    outputPath,
  };
}

async function ensureMissing(pathToFile) {
  try {
    await access(pathToFile);
    return false;
  } catch {
    return true;
  }
}

async function main() {
  const { force, outputPath } = parseArgs(process.argv.slice(2));
  const outputDir = path.dirname(outputPath);
  const tempPath = `${outputPath}.partial`;

  if (!force && !(await ensureMissing(outputPath))) {
    console.log(`模型文件已存在，跳过下载: ${outputPath}`);
    return;
  }

  await mkdir(outputDir, { recursive: true });
  await rm(tempPath, { force: true });

  console.log(`开始下载 ${MODEL_FILE}`);
  console.log(`来源: ${DOWNLOAD_URL.toString()}`);
  console.log(`保存到: ${outputPath}`);

  const response = await fetch(DOWNLOAD_URL, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`下载失败: HTTP ${response.status}`);
  }

  try {
    await pipeline(Readable.fromWeb(response.body), createWriteStream(tempPath));
    await rename(tempPath, outputPath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }

  console.log("模型下载完成");
}

await main();
