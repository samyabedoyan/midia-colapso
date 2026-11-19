# Baixa fotos de uso livre do Unsplash (licença Unsplash: uso comercial livre; só fotos gratuitas, filtradas
# na busca com license=free) para a central escolher.
# Uso: python tools/buscar_fotos.py "<slug>=<photo-id>,<photo-id>,..."  (id = parte depois de images.unsplash.com/photo-)
import json, os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
UA = {"User-Agent": "Mozilla/5.0 (compatible; colapso-lab-central/1.0)"}
lic = json.load(open("stock/licencas.json")) if os.path.exists("stock/licencas.json") else {}
jobs = []
for arg in sys.argv[1:]:
    slug, ids = arg.split("=", 1); d = f"stock/candidatas/{slug}"; os.makedirs(d, exist_ok=True)
    for i, pid in enumerate(ids.split(","), 1): jobs.append((f"{d}/{i:02d}.jpg", pid))
def dl(j):
    fn, pid = j
    url = f"https://images.unsplash.com/photo-{pid}?w=1600&q=85&fm=jpg&fit=max"
    try:
        b = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
        open(fn, "wb").write(b); return fn, pid, None
    except Exception as e: return fn, pid, str(e)
with ThreadPoolExecutor(8) as ex:
    for fn, pid, err in ex.map(dl, jobs):
        if err: print("falhou", fn, err)
        else: lic[fn] = {"imagem": f"https://images.unsplash.com/photo-{pid}", "licenca": "Unsplash License (uso livre, comercial, sem atribuição obrigatória)"}
os.makedirs("stock", exist_ok=True); json.dump(lic, open("stock/licencas.json", "w"), ensure_ascii=False, indent=1); print("ok", len(jobs))
