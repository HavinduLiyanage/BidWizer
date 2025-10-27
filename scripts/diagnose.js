/**
 * BidWizer: quick health check for document indexing
 * Run with: node scripts/diagnose.js
 */

const { execSync } = require("child_process");
const Redis = require("ioredis");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkRedis() {
  let redis;
  try {
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    redis = new Redis(url);
    await redis.set("bidwizer:healthcheck", "ok", "EX", 5);
    const val = await redis.get("bidwizer:healthcheck");
    await redis.quit();
    return val === "ok"
      ? { ok: true, message: `✅ Redis connected (${url})` }
      : { ok: false, message: "⚠️ Redis connected but unable to write key" };
  } catch (err) {
    if (redis) {
      try {
        await redis.quit();
      } catch (quitErr) {
        // Ignore quit errors
      }
    }
    return { ok: false, message: `❌ Redis connection failed: ${err.message}` };
  }
}

function checkWorker() {
  try {
    // Cross-platform process check
    const isWindows = process.platform === "win32";
    let command;
    
    if (isWindows) {
      // Use Windows tasklist command
      command = 'tasklist /FI "IMAGENAME eq node.exe" /FO CSV | findstr indexWorker';
    } else {
      // Use Unix ps command
      command = "ps aux | grep indexWorker | grep -v grep";
    }
    
    const output = execSync(command, {
      encoding: "utf8",
      shell: true,
    });
    
    if (output.includes("indexWorker") || (isWindows && output.includes("node.exe"))) {
      return { ok: true, message: "✅ Worker process is running" };
    } else {
      return {
        ok: false,
        message: "❌ Worker process not found (run: npm run worker)",
      };
    }
  } catch {
    return { ok: false, message: "❌ Worker process not found (run: npm run worker)" };
  }
}

async function checkPendingIndexes() {
  try {
    const rows = await prisma.indexArtifact.findMany({
      select: { docHash: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    if (rows.length === 0)
      return { ok: true, message: "✅ No index artifacts found yet (empty table)" };

    const pending = rows.filter((r) => r.status !== "READY");
    const msgLines = rows.map(
      (r) => `- ${r.docHash.slice(0, 8)}… (${r.status}) updated ${r.updatedAt.toISOString()}`
    );

    if (pending.length)
      return {
        ok: false,
        message:
          `⚠️ ${pending.length} index job(s) still pending:\n` +
          msgLines.join("\n"),
      };
    else
      return {
        ok: true,
        message: "✅ All recent index_artifacts are READY\n" + msgLines.join("\n"),
      };
  } catch (err) {
    return { ok: false, message: `❌ Failed to query DB: ${err.message}` };
  } finally {
    await prisma.$disconnect();
  }
}

(async () => {
  try {
    console.log("🔍 BidWizer Indexing Diagnostics\n");
    const redisStatus = await checkRedis();
    console.log(redisStatus.message);

    const workerStatus = checkWorker();
    console.log(workerStatus.message);

    const dbStatus = await checkPendingIndexes();
    console.log(dbStatus.message);

    console.log(
      "\n💡 If Redis or Worker show ❌, fix those first — otherwise the PDF index will never complete.\n"
    );
  } catch (error) {
    console.error("❌ Unexpected error during diagnostics:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();
