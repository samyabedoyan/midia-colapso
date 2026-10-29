// Clientes configurados na variável de ambiente CLIENTS (JSON), um bloco por cliente:
// {"controlador":{"name":"Clínica ControlaDOR","key":"senha-da-central","pageId":"...","igId":"...","token":"..."}}
// Cada central só enxerga o próprio cliente; a senha (key) é por cliente.

let cache;
function all() {
  if (!cache) {
    try {
      cache = JSON.parse(process.env.CLIENTS || "{}");
    } catch {
      throw new Error("Variável CLIENTS com JSON inválido.");
    }
  }
  return cache;
}

export function authClient(req) {
  const slug = String(req.headers["x-central-client"] || req.query?.client || "").trim();
  const key = String(req.headers["x-central-key"] || "");
  const c = all()[slug];
  if (!slug || !c) return { error: "Cliente não encontrado.", status: 404 };
  if (!c.key || key !== c.key) return { error: "Senha da central incorreta.", status: 401 };
  return { slug, client: c };
}

export function getClient(slug) {
  return all()[slug] || null;
}
