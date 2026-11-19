# Busca fotos de uso livre e baixa candidatas para escolha.
# Fonte: Unsplash (licença Unsplash: uso comercial livre, sem atribuição obrigatória; exclui Unsplash+ pago).
# Uso: python tools/buscar_fotos.py "<slug>=<consulta>" ...  -> stock/candidatas/<slug>/NN.jpg + stock/licencas.json
import json, os, sys, time, urllib.parse, urllib.request
UA = {"User-Agent": "Mozilla/5.0 (compatible; colapso-lab-central/1.0)", "Accept": "application/json"}
def get(url, tries=3):
    for i in range(tries):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()
        except Exception as e:
            err = e; time.sleep(3 * (i + 1))
    raise err
old = json.load(open("stock/licencas.json")) if os.path.exists("stock/licencas.json") else {}
for arg in sys.argv[1:]:
    slug, q = arg.split("=", 1)
    d = f"stock/candidatas/{slug}"
    if os.path.isdir(d) and len(os.listdir(d)) >= 6: print("ja tem", slug); continue
    os.makedirs(d, exist_ok=True)
    try:
        res = json.loads(get("https://unsplash.com/napi/search/photos?" + urllib.parse.urlencode({"query": q, "per_page": 30, "orientation": "portrait"})))["results"]
    except Exception as e:
        print("erro busca", slug, e); continue
    n = 0
    for r in res:
        if n >= 8: break
        if r.get("premium") or r.get("plus") or "plus.unsplash.com" in json.dumps(r.get("urls", {})): continue
        try:
            b = get(r["urls"]["regular"].split("?")[0] + "?w=1600&q=85&fm=jpg")
            n += 1; fn = f"{d}/{n:02d}.jpg"; open(fn, "wb").write(b)
            old[fn] = {"descricao": r.get("alt_description"), "licenca": "Unsplash License (uso livre)", "fonte": r["links"]["html"], "autor": r["user"]["name"]}
        except Exception as e:
            print("falhou", slug, e)
    print(slug, n)
json.dump(old, open("stock/licencas.json", "w"), ensure_ascii=False, indent=1)
