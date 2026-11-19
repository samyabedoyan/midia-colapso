# Busca fotos de uso livre (CC0 / domínio público) no Openverse e baixa candidatas.
# Uso: python tools/buscar_fotos.py "<slug>=<consulta em inglês>" ...  -> stock/candidatas/<slug>/NN.jpg + licencas.json
import json, os, sys, urllib.parse, urllib.request
UA = {"User-Agent": "colapso-lab-central/1.0"}
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()
out = {}
for arg in sys.argv[1:]:
    slug, q = arg.split("=", 1)
    d = f"stock/candidatas/{slug}"; os.makedirs(d, exist_ok=True)
    api = "https://api.openverse.org/v1/images/?" + urllib.parse.urlencode({"q": q, "license": "cc0,pdm", "page_size": 20, "mature": "false", "aspect_ratio": "", "size": "large"})
    try:
        res = json.loads(get(api))["results"]
    except Exception as e:
        print("erro busca", slug, e); continue
    n = 0
    for r in res:
        if n >= 8: break
        try:
            b = get(r["url"])
            if len(b) < 60000: continue
            n += 1; fn = f"{d}/{n:02d}.jpg"; open(fn, "wb").write(b)
            out[fn] = {"titulo": r.get("title"), "licenca": r.get("license"), "fonte": r.get("foreign_landing_url"), "autor": r.get("creator"), "provider": r.get("provider")}
        except Exception as e:
            print("falhou", r.get("url"), e)
    print(slug, n)
old = json.load(open("stock/licencas.json")) if os.path.exists("stock/licencas.json") else {}
old.update(out); json.dump(old, open("stock/licencas.json", "w"), ensure_ascii=False, indent=1)
