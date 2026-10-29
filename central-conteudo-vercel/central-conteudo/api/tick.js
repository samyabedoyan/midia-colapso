// /api/tick — chamado a cada 5 minutos (QStash ou Vercel Cron). Publica o que venceu na fila.
// Protegido pelo cabeçalho Authorization: Bearer CRON_SECRET.
import { getClient } from "../lib/clients.js";
import { publish } from "../lib/meta.js";
import { claimDue, getJob, saveJob } from "../lib/store.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Não autorizado." });
  }
  const ids = await claimDue(Date.now(), 5);
  const done = [];
  for (const id of ids) {
    const job = await getJob(id);
    if (!job) continue;
    const client = getClient(job.client);
    if (!client) {
      job.status = "failed";
      job.results = { erro: { ok: false, error: "Cliente removido da configuração." } };
    } else {
      job.status = "publishing";
      await saveJob(job);
      job.results = await publish(client, job.networks, job.media, job.caption);
      job.status = Object.values(job.results).every((r) => r.ok) ? "published" : "failed";
    }
    job.updatedAt = Date.now();
    await saveJob(job);
    done.push({ id, status: job.status });
  }
  return res.status(200).json({ ok: true, processed: done });
}
