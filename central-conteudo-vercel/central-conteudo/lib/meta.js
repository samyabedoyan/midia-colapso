// Publicação na Meta (Instagram + Facebook) via Graph API.
// Formatos suportados: imagem única e carrossel (2 a 10 imagens JPG).

const VERSION = process.env.META_API_VERSION || "v26.0";
const BASE = `https://graph.facebook.com/${VERSION}`;

export class MetaError extends Error {
  constructor(message, detail) {
    super(message);
    this.detail = detail;
  }
}

async function call(path, params, token, method = "POST") {
  const p = new URLSearchParams({ ...params, access_token: token });
  const url = method === "GET" ? `${BASE}/${path}?${p}` : `${BASE}/${path}`;
  const res = await fetch(url, method === "GET" ? {} : { method, body: p });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new MetaError(`Resposta inválida da Meta (${res.status})`);
  }
  if (data.error) {
    const e = data.error;
    throw new MetaError(e.error_user_msg || e.message || "Erro da Meta", {
      code: e.code,
      subcode: e.error_subcode,
      type: e.type,
      fbtrace_id: e.fbtrace_id,
    });
  }
  return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// O Instagram processa cada mídia antes de aceitar a publicação.
async function waitReady(id, token, { tries = 15, delay = 2000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const { status_code, status } = await call(id, { fields: "status_code,status" }, token, "GET");
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") {
      throw new MetaError(`O Instagram recusou a mídia (${status_code})`, { status });
    }
    await sleep(delay);
  }
  throw new MetaError("O Instagram demorou demais para processar a mídia. Tente de novo.");
}

export function checkMedia(media) {
  if (!Array.isArray(media) || media.length === 0) throw new MetaError("Nenhuma imagem enviada.");
  if (media.length > 10) throw new MetaError("Carrossel aceita no máximo 10 imagens.");
  for (const u of media) {
    if (!/^https:\/\//.test(u)) throw new MetaError(`Link de imagem inválido: ${u}`);
    if (!/\.jpe?g(\?|$)/i.test(u)) throw new MetaError(`A Meta só aceita JPG: ${u}`);
  }
}

export async function publishInstagram({ igId, token }, media, caption, opts) {
  checkMedia(media);
  let creationId;
  if (media.length === 1) {
    ({ id: creationId } = await call(`${igId}/media`, { image_url: media[0], caption }, token));
    await waitReady(creationId, token, opts);
  } else {
    const children = [];
    for (const url of media) {
      const { id } = await call(`${igId}/media`, { image_url: url, is_carousel_item: "true" }, token);
      children.push(id);
    }
    for (const id of children) await waitReady(id, token, opts);
    ({ id: creationId } = await call(
      `${igId}/media`,
      { media_type: "CAROUSEL", children: children.join(","), caption },
      token
    ));
    await waitReady(creationId, token, opts);
  }
  const { id } = await call(`${igId}/media_publish`, { creation_id: creationId }, token);
  let permalink = null;
  try {
    ({ permalink } = await call(id, { fields: "permalink" }, token, "GET"));
  } catch {}
  return { id, permalink };
}

export async function publishFacebook({ pageId, token }, media, caption) {
  checkMedia(media);
  if (media.length === 1) {
    const r = await call(`${pageId}/photos`, { url: media[0], message: caption }, token);
    const postId = r.post_id || r.id;
    return { id: postId, permalink: `https://www.facebook.com/${postId}` };
  }
  const ids = [];
  for (const url of media) {
    const { id } = await call(`${pageId}/photos`, { url, published: "false" }, token);
    ids.push(id);
  }
  const params = { message: caption };
  ids.forEach((id, i) => (params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id })));
  const { id } = await call(`${pageId}/feed`, params, token);
  return { id, permalink: `https://www.facebook.com/${id}` };
}

export async function publish(client, networks, media, caption, opts) {
  const results = {};
  for (const net of networks) {
    try {
      if (net === "instagram") {
        if (!client.igId) throw new MetaError("Instagram não configurado para este cliente.");
        results.instagram = { ok: true, ...(await publishInstagram(client, media, caption, opts)) };
      } else if (net === "facebook") {
        if (!client.pageId) throw new MetaError("Página do Facebook não configurada para este cliente.");
        results.facebook = { ok: true, ...(await publishFacebook(client, media, caption)) };
      } else {
        results[net] = { ok: false, error: "Rede não suportada" };
      }
    } catch (e) {
      results[net] = { ok: false, error: e.message, detail: e.detail || null };
    }
  }
  return results;
}
