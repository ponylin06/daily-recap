#!/usr/bin/env python3
"""18:30晚间复盘 — AI生成完整定性分析并提交GitHub"""
import json, os, re, urllib.request
from datetime import datetime, timezone, timedelta

for k in list(os.environ.keys()):
    if 'proxy' in k.lower(): del os.environ[k]

TZ = timezone(timedelta(hours=8))
NOW = datetime.now(TZ)
TODAY = NOW.strftime('%Y-%m-%d')
FILE = os.path.expanduser(f'~/recap-site/data/{TODAY}.json')

if not os.path.exists(FILE):
    print(f'{FILE} 不存在，先等16:00数据抓取')
    exit(0)

with open(FILE) as f: d = json.load(f)

H = {'User-Agent': 'Mozilla/5.0'}
def tx(code):
    req = urllib.request.Request(f'https://qt.gtimg.cn/q={code}', headers=H)
    with urllib.request.urlopen(req, timeout=8) as r:
        return r.read().decode('gbk', errors='ignore')

# 补纳指（用腾讯，18:30美东已出最新数据）
for code, key in [('usIXIC','nasdaq')]:
    try:
        t = tx(code)
        m = re.search(r'(\d{4}-\d{2}-\d{2}[\s\d:]+)~(-?[\d.]+)~(-?[\d.]+)~', t)
        if m:
            d['external'] = d.get('external', {})
            d['external'][key] = f"{float(m.group(3)):+.2f}%"
    except: pass

# ==== AI生成定性分析 ====
KEY = os.environ.get('DEEPSEEK_KEY','')
if not KEY:
    try:
        with open(os.path.expanduser('~/.deepseek_key')) as f:
            KEY = f.read().strip()
    except: pass

if KEY:
    idx = d.get('indices', {})
    ext = d.get('external', {})
    sent = d.get('sentiment', {})
    ceiling = d.get('ceiling', {})
    ladder = d.get('ladder', [])
    risks_text = '、'.join(d.get('risks', [])[:3])

    ladder_summary = '、'.join([f"{x['tier']} {x['stock']}" for x in ladder[:5]])

    prompt = f"""你是A股复盘助手。根据当日收盘数据，生成完整的每日复盘分析。

数据：
- 上证{idx['上证']['close']}({idx['上证']['chg']}) 深{idx['深成指']['chg']} 创{idx['创业板']['chg']} 科创{idx['科创50']['chg']}
- 成交{d['totalVolume']} {d.get('volumeChange','')}
- 涨停{sent.get('limitUp','?')} 跌停{sent.get('limitDown','?')}
- 涨{int(d.get('upCount',0))} 跌{int(d.get('downCount',0))}
- 纳指{ext.get('nasdaq','?')} 日经{ext.get('nikkei','?')} 韩国{ext.get('kospi','?')}
- 最高板{ceiling.get('max','?')}({ceiling.get('stock','?')})
- 连板: {ladder_summary}
- 关键节点: {json.dumps(d.get('keyMoments',[]), ensure_ascii=False)[:200]}
- 池子: {json.dumps(d.get('poolStatus',[]), ensure_ascii=False)[:200]}
- 已知风险: {risks_text}

输出JSON(不要markdown):
{{"sentimentNote":"情绪定性(100字)","cycleNature":"周期定性(100字)","visibleLines":"明线方向(3行按强度排序)","hiddenLines":"暗线逻辑(3行资金+轮动)","capitalFlow":"资金判断(2行)","strategy":"明日策略(3行具体操作+方向+节奏)","risks":["风险1","风险2","风险3","风险4"],"volumeProfile":[{{"period":"上午","volume":"","behavior":""}},{{"period":"下午","volume":"","behavior":""}}],"techAnchors":[{{"anchor":"20日线","position":"","status":""}},{{"anchor":"科创50","position":"","status":""}}],"divergence":[{{"dim":"","today":""}},{{"dim":"","today":""}}]}}"""

    try:
        req = urllib.request.Request('https://api.deepseek.com/v1/chat/completions',
            data=json.dumps({"model":"deepseek-chat","messages":[{"role":"user","content":prompt}],"max_tokens":1500}).encode(),
            headers={'Content-Type':'application/json','Authorization':f'Bearer {KEY}'})
        with urllib.request.urlopen(req, timeout=45) as r:
            t = json.loads(r.read())['choices'][0]['message']['content']
        m = re.search(r'\{[\s\S]*\}', t)
        if m:
            ai = json.loads(m.group())
            d['sentiment']['note'] = ai.get('sentimentNote','')
            d['cycle']['nature'] = ai.get('cycleNature','')
            d['visibleLines'] = ai.get('visibleLines','')
            d['hiddenLines'] = ai.get('hiddenLines','')
            d['capitalFlow'] = ai.get('capitalFlow','')
            d['strategy'] = ai.get('strategy','')
            d['risks'] = ai.get('risks', d.get('risks',['']))
            if ai.get('volumeProfile'): d['volumeProfile'] = ai['volumeProfile']
            if ai.get('techAnchors'): d['techAnchors'] = ai['techAnchors']
            if ai.get('divergence'): d['divergence'] = ai['divergence']
            print("✅ AI完整复盘已生成")
    except Exception as e:
        print(f"AI失败: {e}")

# 财经新闻（金十模式：A股精选 + 全球宏观）
try:
    import akshare as ak; import warnings; warnings.filterwarnings('ignore'); import re
    df = ak.stock_info_global_em()
    cn_kw = ['A股','沪指','深成指','创业板','科创','涨停','跌停','沪深','上证','深证',
             '券商','半导体','芯片','ETF','北向','IPO','证监会','中报','业绩','板块',
             '新能源','光伏','锂电','医药','消费','汽车','军工','房地产']
    gl_kw = ['美联储','欧洲央行','英国央行','日本央行','加息','降息','CPI','PCE','GDP',
             '非农','PMI','汇率','美元','黄金','原油','美股','纳斯达克','标普','道指',
             '费城半导体','韩国','日本','欧洲','IMF','衰退','通胀']
    cn_news, gl_news = [], []
    for _, row in df.iterrows():
        t = str(row.get('标题',''))
        if len(t) < 15: continue
        item = {'title':t[:80],'time':str(row.get('发布时间',''))[:16],'link':str(row.get('链接',''))}
        if re.search('|'.join(cn_kw), t) and len(cn_news) < 6:
            cn_news.append(item)
        elif re.search('|'.join(gl_kw), t) and len(gl_news) < 6:
            gl_news.append(item)
        if len(cn_news) >= 6 and len(gl_news) >= 6: break
    d['news'] = cn_news
    d['globalNews'] = gl_news
    print(f'新闻: A股{len(cn_news)}条 全球{len(gl_news)}条')
except Exception as e:
    print(f'新闻失败: {e}')

# 写入
with open(FILE, 'w') as f: json.dump(d, f, ensure_ascii=False, indent=2)
print(f"✅ {FILE}")

# 提交GitHub
try:
    with open(os.path.expanduser('~/.gh_token')) as f:
        token = f.read().strip()
    import base64
    content = base64.b64encode(json.dumps(d, ensure_ascii=False, indent=2).encode()).decode()
    p = f'data/{TODAY}.json'
    u = f'https://api.github.com/repos/ponylin06/daily-recap/contents/{p}'
    A = {'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json'}
    get_req = urllib.request.Request(u, headers=A)
    with urllib.request.urlopen(get_req, timeout=10) as r:
        sha = json.loads(r.read()).get('sha','')
    body = json.dumps({'message':f'🤖 AI复盘 {TODAY}','content':content,'sha':sha,'branch':'main'}).encode()
    put_req = urllib.request.Request(u, data=body, headers={**A,'Content-Type':'application/json'}, method='PUT')
    with urllib.request.urlopen(put_req, timeout=10) as r:
        print('✅ 已提交GitHub')
except Exception as e:
    print(f'提交失败: {e}')
