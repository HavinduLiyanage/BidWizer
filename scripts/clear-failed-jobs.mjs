/**
 * Clear failed jobs from the indexing queue
 */
import IORedis from "ioredis";
import { Queue } from "bullmq";

const env = {
  REDIS_URL: process.env.REDIS_URL || "",
};

const redis = new IORedis(env.REDIS_URL);
const QUEUE_NAME = process.env.BIDWIZER_INDEX_QUEUE || "tender-indexing";
const queue = new Queue(QUEUE_NAME, { connection: redis });

async function clearFailedJobs() {
  try {
    const failed = await queue.getFailed();
    console.log(`[clear] Found ${failed.length} failed jobs`);
    
    if (failed.length > 0) {
      // Clear all failed jobs
      await queue.clean(0, 100, 'failed');
      console.log(`[clear] Cleared ${failed.length} failed jobs`);
    }
    
    // Also clear completed jobs to free up memory
    const completed = await queue.getCompleted();
    if (completed.length > 0) {
      await queue.clean(0, 100, 'completed');
      console.log(`[clear] Cleared ${completed.length} completed jobs`);
    }
    
    // Check final state
    const finalFailed = await queue.getFailed();
    const finalWaiting = await queue.getWaiting();
    const finalActive = await queue.getActive();
    
    console.log(`[clear] Final queue state:`);
    console.log(`  - Failed: ${finalFailed.length}`);
    console.log(`  - Waiting: ${finalWaiting.length}`);
    console.log(`  - Active: ${finalActive.length}`);
    
  } catch (error) {
    console.error('[clear] Error:', error.message);
  } finally {
    await queue.close();
    await redis.quit();
  }
}

clearFailedJobs();

