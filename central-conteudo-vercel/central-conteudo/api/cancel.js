// POST /api/cancel — tira um post da fila antes do horário.
import { authClient } from "../lib/clients.js";
import { cancel, getJob } from "../lib/store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const auth = authClient(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const id = req.body?.id;
  const existing = id ? await getJob(id) : null;
  if (!existing || existing.client !== auth.slug) return res.status(404).json({ error: "Post não encontrado." });
  const { removed, job } = await cancel(id);
  if (!removed) return res.status(409).json({ error: "Esse post já saiu da fila (publicado ou em publicação)." });
  return res.status(200).json({ ok: true, job });
}
