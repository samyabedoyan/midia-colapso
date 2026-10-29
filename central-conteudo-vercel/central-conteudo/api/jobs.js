// GET /api/jobs — lista os posts programados e publicados do cliente (últimos 60 dias).
import { authClient } from "../lib/clients.js";
import { listJobs } from "../lib/store.js";

export default async function handler(req, res) {
  const auth = authClient(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  try {
    const jobs = await listJobs(auth.slug, Date.now() - 60 * 864e5);
    return res.status(200).json({ ok: true, client: auth.client.name || auth.slug, jobs });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
