/**
 * Check failed jobs in the indexing queue
 */
import IORedis from "ioredis";
import { Queue } from "bullmq";

const env = {
  REDIS_URL: process.env.REDIS_URL || "",
};

const redis = new IORedis(env.REDIS_URL);
const QUEUE_NAME = process.env.BIDWIZER_INDEX_QUEUE || "tender-indexing";
const queue = new Queue(QUEUE_NAME, { connection: redis });

async function checkFailedJobs() {
  try {
    const failed = await queue.getFailed();
    console.log(`[check] Failed jobs count: ${failed.length}`);
    
    if (failed.length > 0) {
      console.log('\n[check] Latest 3 failed jobs:');
      const recent = failed.slice(-3);
      
      for (const job of recent) {
        console.log(`\nJob ID: ${job.id}`);
        console.log(`Job Name: ${job.name}`);
        console.log(`Failed Reason: ${job.failedReason}`);
        console.log(`Attempts: ${job.attemptsMade}/${job.opts.attempts}`);
        console.log(`Created: ${new Date(job.timestamp).toISOString()}`);
        console.log(`Failed: ${new Date(job.finishedOn).toISOString()}`);
        
        if (job.stacktrace) {
          console.log(`Stack trace:\n${job.stacktrace}`);
        }
        console.log('---');
      }
    }
    
    // Also check waiting jobs
    const waiting = await queue.getWaiting();
    console.log(`\n[check] Waiting jobs: ${waiting.length}`);
    
    if (waiting.length > 0) {
      console.log('Waiting job details:');
      waiting.forEach(job => {
        console.log(`- Job ${job.id}: ${job.name} (created: ${new Date(job.timestamp).toISOString()})`);
      });
    }
    
  } catch (error) {
    console.error('[check] Error:', error.message);
  } finally {
    await queue.close();
    await redis.quit();
  }
}

checkFailedJobs();

