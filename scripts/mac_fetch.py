#!/usr/bin/env python3
"""Mac本地 — 每天16:00 抓齐所有数据 → 写JSON"""
import json, os, sys, re, urllib.request
from datetime import datetime, timezone, timedelta

# 绕过公司代理
for k in list(os.environ.keys()):
    if 'proxy' in k.lower(): del os.environ[k]

TZ = timezone(timedelta(hours=8))
NOW = datetime.now(TZ)
TODAY = NOW.strftime('%Y-%m-%d')
if NOW.weekday() >= 5: sys.exit(0)

H = {'User-Agent': 'Mozilla/5.0'}

def tx(code):
    req = urllib.request.Request(f'https://qt.gtimg.cn/q={code}', headers=H)
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.read().decode('gbk', errors='ignore')

def em(url):
    req = urllib.request.Request(url, headers=H)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

# ===== 1. 涨跌停+涨跌家数 (AKShare 乐股接口) =====
limit_up = limit_down = up_count = dn_count = 0
try:
    import akshare as ak
    import warnings; warnings.filterwarnings('ignore')
    df = ak.stock_market_activity_legu()
    row = df.set_index('item')['value']
    up_count = int(row.get('上涨', 0))
    dn_count = int(row.get('下跌', 0))
    limit_up = int(row.get('涨停', 0))
    limit_down = int(row.get('跌停', 0))
    print(f"AKShare: 涨{up_count} 跌{dn_count} | 涨停{limit_up} 跌停{limit_down}")
except Exception as e:
    print(f"AKShare失败: {e}")

# ===== 2. 日韩 (东财，Mac能通) =====
nikkei = kospi = "N/A"
try:
    d = em("https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f3&secids=100.N225,100.KS11")
    if d['data'] and len(d['data']['diff']) >= 2:
        nikkei = f"{d['data']['diff'][0]['f3']:+.2f}%"
        kospi = f"{d['data']['diff'][1]['f3']:+.2f}%"
except: pass

# ===== 3. 指数 + 纳指 (腾讯) =====
idx_cfg = [('sh000001','上证'),('sz399001','深成指'),('sz399006','创业板'),('sh000688','科创50')]
indices = {}
for code, name in idx_cfg:
    try:
        t = tx(code); parts = t.split('~')
        price = float(parts[3]) if len(parts) > 3 else 0
        m = re.search(r'(\d{14})~(-?[\d.]+)~(-?[\d.]+)~', t)
        chg = float(m.group(3)) if m else 0
        amt = float(parts[37])/1e4 if len(parts) > 37 and parts[37] else 0
        indices[name] = {'close': round(price,2), 'chg': f'{chg:+.2f}%', 'vol': round(amt)}
    except: indices[name] = {'close':0,'chg':'N/A','vol':0}

nas = "N/A"
try:
    t = tx('usIXIC')
    m = re.search(r'(\d{4}-\d{2}-\d{2}[\s\d:]+)~(-?[\d.]+)~(-?[\d.]+)~', t)
    if m: nas = f"{float(m.group(3)):+.2f}%"
except: pass

total_vol = (indices.get('上证',{}).get('vol',0) + indices.get('深成指',{}).get('vol',0)) / 1e4

# ===== 4. 连板梯队 =====
ladder = []
try:
    import akshare as ak
    df = ak.stock_zt_pool_em(date=TODAY.replace('-',''))
    df_lb = df[df['连板数']>=2].sort_values('连板数', ascending=False)
    for lb, grp in df_lb.groupby('连板数'):
        for _, row in grp.iterrows():
            ladder.append({
                'tier': f'{int(lb)}板',
                'stock': row['名称'],
                'direction': row.get('所属行业',''),
                'role': '最高标' if lb == df_lb['连板数'].max() else '',
                'relation': f"封板{row.get('首次封板时间','?')} 炸板{int(row.get('炸板次数',0))}次"
            })
    print(f'连板梯队: {len(ladder)}只')
except Exception as e:
    print(f'连板梯队: {e}')

# ===== 5. 池子 =====
POOL = [('sh600176','中国巨石'),('sh603986','兆易创新'),('sz000811','冰轮环境'),
        ('sh605111','新洁能'),('sz002384','东山精密'),('sz002281','光迅科技'),
        ('sz000636','风华高科'),('sh600183','生益科技')]
pool_status = []
for code, name in POOL:
    try:
        t = tx(code); parts = t.split('~')
        price = float(parts[3]) if len(parts) > 3 else 0
        m = re.search(r'(\d{14})~(-?[\d.]+)~(-?[\d.]+)~', t)
        chg = float(m.group(3)) if m else 0
        clr = '🟢' if chg > 0 else ('🔴' if chg < -5 else '🟡')
        pool_status.append({'status':clr,'stock':name,'today':f'{chg:+.2f}%','close':price})
    except: pass

# ===== 5. 写入JSON =====
recap_path = os.path.expanduser('~/recap-site/data')
os.makedirs(recap_path, exist_ok=True)
filepath = os.path.join(recap_path, f'{TODAY}.json')

if os.path.exists(filepath):
    with open(filepath) as f: old = json.load(f)
else: old = {}

old['indices'] = indices
old['upCount'] = up_count
old['downCount'] = dn_count
old['limitUp'] = limit_up
old['limitDown'] = limit_down
old['poolStatus'] = pool_status
old['ladder'] = ladder
old['external'] = old.get('external',{})
old['external']['nasdaq'] = nas
old['external']['nikkei'] = nikkei
old['external']['kospi'] = kospi
old['totalVolume'] = f'{total_vol:.2f}万亿'
if 'sentiment' in old:
    old['sentiment']['limitUp'] = limit_up
    old['sentiment']['limitDown'] = limit_down
    old['sentiment']['upCount'] = up_count
    old['sentiment']['downCount'] = dn_count

with open(filepath, 'w') as f: json.dump(old, f, ensure_ascii=False, indent=2)
print(f"✅ {filepath} | 涨{up_count}跌{dn_count} | 涨停{limit_up}跌停{limit_down} | 纳指{nas}")

# ===== 6. 自动提交到GitHub =====
# 从Vercel env获取token (如果存在)
token = os.environ.get('GH_TOKEN','')
if not token:
    # fallback: 从 ~/.gh_token 读取
    try:
        with open(os.path.expanduser('~/.gh_token')) as f:
            token = f.read().strip()
    except: pass

if token:
    try:
        import base64
        content = base64.b64encode(json.dumps(old, ensure_ascii=False, indent=2).encode()).decode()
        p = f'data/{TODAY}.json'
        u = f'https://api.github.com/repos/ponylin06/daily-recap/contents/{p}'
        A = {'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json'}
        # 读旧文件sha
        get_req = urllib.request.Request(u, headers=A)
        with urllib.request.urlopen(get_req, timeout=10) as r:
            sha = json.loads(r.read()).get('sha','')
        # 更新
        body = json.dumps({'message':f'Mac自动补全 {TODAY}','content':content,'sha':sha,'branch':'main'}).encode()
        put_req = urllib.request.Request(u, data=body, headers={**A,'Content-Type':'application/json'}, method='PUT')
        with urllib.request.urlopen(put_req, timeout=10) as r:
            print('✅ 已提交到GitHub')
    except Exception as e:
        print(f'GitHub提交失败(需token): {e}')
