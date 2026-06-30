#!/usr/bin/env python3
"""
美股收盘数据抓取 — 每天早上 8 点运行
产出: data/_us_latest.json
"""
import json, os, sys
from datetime import datetime, timezone, timedelta

try:
    import requests
except ImportError:
    import urllib.request as _req
    import json as _json
    def _get(url):
        r = _req.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with _req.urlopen(r, timeout=15) as resp:
            return _json.loads(resp.read())
    requests = type('req', (), {'get': lambda url, timeout=15: type('r', (), {'json': lambda: _get(url)})()})()

TZ = timezone(timedelta(hours=8))
NOW = datetime.now(TZ)
TODAY = NOW.strftime('%Y-%m-%d')

# 美股三大指数 + 费城半导体
# 100.NDX=纳斯达克, 100.DJIA=道琼斯, 100.SPCS=标普500, 100.SOX=费城半导体
BASE = "https://push2.eastmoney.com/api/qt"
us_codes = "100.NDX,100.DJIA,100.SPCS,100.SOX"
us_names = ['纳斯达克', '道琼斯', '标普500', '费城半导体']

try:
    data = {"_fetched": TODAY, "_fetchedAt": NOW.strftime('%H:%M')}
    resp = requests.get(
        f"{BASE}/ulist.np/get?fltt=2&fields=f2,f3,f4,f6&secids={us_codes}",
        timeout=15
    ).json()
    for i, name in enumerate(us_names):
        d = resp['data']['diff'][i]
        data[name] = {
            'close': d['f2'],
            'chg': f"{d['f3']:+.2f}%",
            'chgRaw': d['f3']
        }

    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', '_us_latest.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ 美股数据已保存: {out}")
    for name in us_names:
        print(f"   {name}: {data[name]['close']} ({data[name]['chg']})")
except Exception as e:
    print(f"❌ 美股数据抓取失败: {e}")
    sys.exit(1)
