# Remembrance Dialer — Verified Capabilities

This repo's piece of the [ecosystem](../Void-Data-Compressor/CAPABILITIES.md).

Last verified: 2026-04-30, branch `claude/audit-remembrance-ecosystem-xaaUr`.

---

## Role in ecosystem

Connection-routing / "dialer" layer. Resolves resource references
(URIs, services, agents) and routes calls between ecosystem nodes.

By function count: 66 functions across 62 PULL / 4 REFINE / 0 REJECT
(94% recognized). Per-repo modulator: μ=0.9166, modulator=1.0222 —
above mean, modest lift.

---

## ✅ Verified

| # | Capability | Test |
|---|---|---|
| 1 | All 66 functions scored under v3 | `python3 -c "import json; d=json.load(open('../Void-Data-Compressor/cross_repo_function_records.json')); print(sum(1 for r in d['records'] if r['repo']=='dialer'))"` returns 66 |
| 2 | 94% recognition rate | 62 PULL / 4 REFINE per `pipeline/decisions_summary.json::per_repo.dialer` |
| 3 | Cascade reach | dialer takes flips when oracle SPAWNs are promoted — see `flips_by_repo.dialer` in `pipeline/cascade_potential_thinned.json` |
| 4 | Source paths resolve | `REPO_ROOTS['dialer'] = '/home/user/Remembrance-dialer'` consistent across 6 void-side scripts |

---

## ❌ Out of scope here

- Substrate / scoring — void
- Atomic table / covenant — oracle
- Multi-agent orchestration — swarm

---

## Quick verification

```bash
cd ../Void-Data-Compressor
python3 -c "
import json
d = json.load(open('cross_repo_function_records.json'))
dial = [r for r in d['records'] if r['repo'] == 'dialer']
print(f'dialer records: {len(dial)}')
from collections import Counter
print('decisions:', Counter(r.get('gate_decision') for r in dial))
"
```

---

*Cross-cutting capabilities: see [`Void-Data-Compressor/CAPABILITIES.md`](../Void-Data-Compressor/CAPABILITIES.md).*
