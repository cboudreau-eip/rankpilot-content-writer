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

/** Calculate the next future run time for a job (same logic as routers.ts calculateNextRunTime) */
function nextFutureRunTime(
  frequency: string,
  hourUtc: number,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
): Date {
  const now = new Date();
  const nowWithBuffer = new Date(now.getTime() - 60_000);
  const next = new Date();
  next.setUTCHours(hourUtc, 0, 0, 0);

  if (frequency === "daily") {
    if (next <= nowWithBuffer) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
  } else if (frequency === "weekly") {
    const targetDay = dayOfWeek ?? 1;
    const currentDay = next.getUTCDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && next <= nowWithBuffer)) {
      daysUntil += 7;
    }
    next.setUTCDate(next.getUTCDate() + daysUntil);
  } else if (frequency === "monthly") {
    const targetDate = dayOfMonth ?? 1;
    next.setUTCDate(targetDate);
    if (next <= nowWithBuffer) {
      next.setUTCMonth(next.getUTCMonth() + 1);
    }
  }

  return next;
}

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

/**
 * On startup, reset any overdue jobs instead of firing them immediately.
 * This prevents server restarts from triggering unexpected off-schedule runs.
 * A job is considered "overdue" if its nextRunAt is more than 5 minutes in the past.
 */
async function resetOverdueJobsOnStartup() {
  try {
    const dueJobs = await getDueScheduledJobs();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);

    for (const job of dueJobs) {
      if (job.nextRunAt && new Date(job.nextRunAt) < fiveMinutesAgo) {
        // Job is overdue — reset to next proper scheduled time instead of firing
        const nextRunAt = nextFutureRunTime(job.frequency, job.hourUtc, job.dayOfWeek, job.dayOfMonth);
        console.log(`[Scheduler] Startup: Job ${job.id} (${job.name}) was overdue (nextRunAt=${job.nextRunAt}). Resetting to ${nextRunAt.toISOString()} instead of firing.`);
        await updateScheduledJob(job.id, { nextRunAt, isRunning: 0 });
      }
    }
  } catch (err) {
    console.error("[Scheduler] Error resetting overdue jobs on startup:", err);
  }
}

export function startSchedulerEngine() {
  if (intervalId) {
    console.warn("[Scheduler] Engine already running");
    return;
  }

  console.log("[Scheduler] Starting scheduler engine (checking every 60s)");
  intervalId = setInterval(checkAndRunDueJobs, CHECK_INTERVAL_MS);

  // On startup: reset overdue jobs first, then begin normal polling.
  // This prevents server restarts from triggering unexpected off-schedule runs.
  resetOverdueJobsOnStartup().then(() => {
    // Only run the first check after overdue jobs have been handled
    checkAndRunDueJobs();
  });
}

export function stopSchedulerEngine() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Scheduler] Engine stopped");
  }
}
