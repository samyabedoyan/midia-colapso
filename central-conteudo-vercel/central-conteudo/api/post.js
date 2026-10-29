// POST /api/post — publica agora ou coloca na fila para o horário escolhido.
// Corpo: { ref, title, networks:["instagram","facebook"], media:[urls], caption, when?: ISO }
import { authClient } from "../lib/clients.js";
import { publish, checkMedia } from "../lib/meta.js";
import { enqueue, saveJob } from "../lib/store.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const auth = authClient(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const { ref = null, title = "", networks, media, caption = "", when } = req.body || {};
  const nets = (Array.isArray(networks) ? networks : []).filter((n) => n === "instagram" || n === "facebook");
  if (!nets.length) return res.status(400).json({ error: "Escolha Instagram, Facebook ou os dois." });
  try {
    checkMedia(media);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  if (caption.length > 2200) return res.status(400).json({ error: "A legenda passa de 2.200 caracteres." });

  const now = Date.now();
  const whenTs = when ? Date.parse(when) : now;
  if (Number.isNaN(whenTs)) return res.status(400).json({ error: "Data e hora inválidas." });

  const job = {
    id: `${now.toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    client: auth.slug,
    ref,
    title,
    networks: nets,
    media,
    caption,
    whenTs,
    createdAt: now,
    status: "scheduled",
    results: null,
  };

  // Programado para mais de 1 minuto à frente: vai para a fila.
  if (whenTs - now > 60_000) {
    try {
      await enqueue(job);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
    return res.status(200).json({ ok: true, scheduled: true, job });
  }

  job.status = "publishing";
  job.results = await publish(auth.client, nets, media, caption);
  job.status = Object.values(job.results).every((r) => r.ok) ? "published" : "failed";
  job.updatedAt = Date.now();
  try {
    await saveJob(job);
  } catch {
    // Sem fila configurada, o post já saiu; só não fica no histórico.
  }
  return res.status(job.status === "published" ? 200 : 502).json({ ok: job.status === "published", job });
}
