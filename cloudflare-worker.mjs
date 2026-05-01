import openNextWorker from "./.open-next/worker.js";

export {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from "./.open-next/worker.js";

const dailyPushCron = "59 23 * * *";
const fallbackSiteUrl = "https://thedevilsaidictionary.com";

function dailySendUrl(env) {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl;
  return new URL("/api/mobile/push/daily-send", siteUrl);
}

async function runDailySend(env, ctx) {
  const secret = env.PUSH_TEST_SEND_SECRET;

  if (!secret) {
    throw new Error("PUSH_TEST_SEND_SECRET is not configured on the Worker.");
  }

  const response = await openNextWorker.fetch(
    new Request(dailySendUrl(env), {
      body: "{}",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
        "x-devils-scheduled-source": "cloudflare-cron",
      },
      method: "POST",
    }),
    env,
    ctx,
  );
  const body = await response.text();

  if (!response.ok) {
    console.error(
      JSON.stringify({
        body,
        cron: dailyPushCron,
        status: response.status,
        task: "daily-send",
      }),
    );
    throw new Error(`Scheduled daily-send returned HTTP ${response.status}.`);
  }

  console.log(
    JSON.stringify({
      body,
      cron: dailyPushCron,
      status: response.status,
      task: "daily-send",
    }),
  );
}

const worker = {
  fetch(request, env, ctx) {
    return openNextWorker.fetch(request, env, ctx);
  },

  async scheduled(controller, env, ctx) {
    if (controller.cron !== dailyPushCron) {
      console.warn(
        JSON.stringify({
          cron: controller.cron,
          expected: dailyPushCron,
          task: "ignored-scheduled-event",
        }),
      );
      return;
    }

    await runDailySend(env, ctx);
  },
};

export default worker;
