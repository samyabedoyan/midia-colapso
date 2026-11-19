# Baixa fotos de uso livre do Unsplash (licença Unsplash: uso comercial livre; só fotos marcadas como gratuitas,
# escolhidas na busca com license=free) para a central escolher.
# Uso: python tools/buscar_fotos.py "<slug>=<id1>,<id2>,..."  -> stock/candidatas/<slug>/NN-<id>.jpg + stock/licencas.json
import json, os, sys, time, urllib.request
UA = {"User-Agent": "Mozilla/5.0 (compatible; colapso-lab-central/1.0)"}
def get(url, tries=3):
    for i in range(tries):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except Exception as e:
            err = e; time.sleep(3 * (i + 1))
    raise err
lic = json.load(open("stock/licencas.json")) if os.path.exists("stock/licencas.json") else {}
for arg in sys.argv[1:]:
    slug, ids = arg.split("=", 1)
    d = f"stock/candidatas/{slug}"; os.makedirs(d, exist_ok=True); n = 0
    for i, pid in enumerate(ids.split(","), 1):
        fn = f"{d}/{i:02d}-{pid}.jpg"
        if os.path.exists(fn): continue
        try:
            b = get(f"https://unsplash.com/photos/{pid}/download?force=true&w=1600")
            open(fn, "wb").write(b); n += 1
            lic[fn] = {"fonte": f"https://unsplash.com/photos/{pid}", "licenca": "Unsplash License (uso livre, comercial, sem atribuição obrigatória)"}
        except Exception as e:
            print("falhou", slug, pid, e)
    print(slug, n)
json.dump(lic, open("stock/licencas.json", "w"), ensure_ascii=False, indent=1)
