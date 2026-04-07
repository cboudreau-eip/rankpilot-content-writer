/**
 * Scheduler Engine — periodically checks for due scheduled jobs and executes them.
 * Runs as part of the server process, checking every 60 seconds.
 */

import { getDueScheduledJobs, updateScheduledJob } from "./db";

// Import the executeScheduledJob function dynamically to avoid circular deps
let executeJob: ((jobId: number) => Promise<void>) | null = null;

export function setJobExecutor(fn: (jobId: number) => Promise<void>) {
  executeJob = fn;
}

const CHECK_INTERVAL_MS = 60_000; // Check every 60 seconds
let intervalId: ReturnType<typeof setInterval> | null = null;

async function checkAndRunDueJobs() {
  try {
    const dueJobs = await getDueScheduledJobs();

    if (dueJobs.length === 0) return;

    console.log(`[Scheduler] Found ${dueJobs.length} due job(s)`);

    for (const job of dueJobs) {
      if (!executeJob) {
        console.warn("[Scheduler] No job executor registered, skipping");
        return;
      }

      try {
        // Mark as running before starting
        await updateScheduledJob(job.id, { isRunning: 1 });

        // Execute asynchronously — don't block other jobs
        executeJob(job.id).catch((err) => {
          console.error(`[Scheduler] Job ${job.id} (${job.name}) failed:`, err);
        });
      } catch (err) {
        console.error(`[Scheduler] Failed to start job ${job.id}:`, err);
        await updateScheduledJob(job.id, { isRunning: 0 });
      }
    }
  } catch (err) {
    console.error("[Scheduler] Error checking for due jobs:", err);
  }
}

export function startSchedulerEngine() {
  if (intervalId) {
    console.warn("[Scheduler] Engine already running");
    return;
  }

  console.log("[Scheduler] Starting scheduler engine (checking every 60s)");
  intervalId = setInterval(checkAndRunDueJobs, CHECK_INTERVAL_MS);

  // Also run immediately on startup
  checkAndRunDueJobs();
}

export function stopSchedulerEngine() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Scheduler] Engine stopped");
  }
}
