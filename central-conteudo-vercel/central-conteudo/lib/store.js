// Fila de posts programados no Upstash Redis (API REST, sem dependências).

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export async function redis(...args) {
  if (!URL_ || !TOKEN) throw new Error("Banco da fila não configurado (UPSTASH_REDIS_REST_URL / TOKEN).");
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(args),
  });
  const j = await r.json();
  if (j.error) throw new Error(`Fila: ${j.error}`);
  return j.result;
}

const QUEUE = "queue";
const jobKey = (id) => `job:${id}`;
const listKey = (client) => `jobs:${client}`;

export async function saveJob(job) {
  await redis("SET", jobKey(job.id), JSON.stringify(job));
  await redis("ZADD", listKey(job.client), String(job.whenTs), job.id);
}

export async function getJob(id) {
  const raw = await redis("GET", jobKey(id));
  return raw ? JSON.parse(raw) : null;
}

export async function enqueue(job) {
  await saveJob(job);
  await redis("ZADD", QUEUE, String(job.whenTs), job.id);
}

// Retira da fila os posts vencidos. ZREM funciona como trava: só quem removeu publica.
export async function claimDue(now, limit = 5) {
  const ids = (await redis("ZRANGEBYSCORE", QUEUE, "-inf", String(now), "LIMIT", "0", String(limit))) || [];
  const claimed = [];
  for (const id of ids) {
    if ((await redis("ZREM", QUEUE, id)) === 1) claimed.push(id);
  }
  return claimed;
}

export async function cancel(id) {
  const removed = await redis("ZREM", QUEUE, id);
  const job = await getJob(id);
  if (job && removed === 1) {
    job.status = "cancelled";
    job.updatedAt = Date.now();
    await saveJob(job);
  }
  return { removed: removed === 1, job };
}

export async function listJobs(client, fromTs = 0) {
  const ids = (await redis("ZRANGEBYSCORE", listKey(client), String(fromTs), "+inf")) || [];
  if (!ids.length) return [];
  const raws = await redis("MGET", ...ids.map(jobKey));
  return raws.filter(Boolean).map((r) => JSON.parse(r));
}
