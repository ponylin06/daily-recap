export default async function handler(req, res) {
  const today = new Date().toISOString().split('T')[0]
  const r = { fetched: today, upCount: 0, downCount: 0, limitUp: 0, limitDown: 0, pool: [], committed: false }
  const H = { 'User-Agent': 'Mozilla/5.0' }

  async function tx(code) {
    const u = 'https://qt.gtimg.cn/q=' + code
    const resp = await fetch(u, { headers: H, signal: AbortSignal.timeout(8000) })
    if (!resp.ok) return ''
    return resp.text()
  }

  // 1. 池子行情（腾讯格式：~现价~今开~...~涨跌额~涨跌幅%）
  const POOL = [
    ['sh600176','中国巨石'],['sh603986','兆易创新'],['sz000811','冰轮环境'],
    ['sh605111','新洁能'],['sh600183','生益科技'],['sz000636','风华高科'],
    ['sz002384','东山精密'],['sz002281','光迅科技'],
  ]
  for (let i = 0; i < POOL.length; i++) {
    try {
      const t = await tx(POOL[i][0])
      // 解析：用 ~ 分割，找涨跌幅（通常在末尾区段）
      const parts = t.split('~')
      if (parts.length > 30) {
        const price = parseFloat(parts[3]) || 0
        const chgPct = parseFloat(parts[32]) || 0
        let clr = '🟡'
        if (chgPct > 0) clr = '🟢'
        if (chgPct < -5) clr = '🔴'
        r.pool.push({ status: clr, stock: POOL[i][1], today: chgPct.toFixed(2) + '%', close: price })
      }
    } catch(e) {}
  }

  // 2. 涨跌家数（从新浪财经指数页面）
  try {
    const sh = await (await fetch(
      'https://hq.sinajs.cn/list=s_sh000001,s_sz399001',
      { headers: { ...H, Referer: 'https://finance.sina.com.cn/' }, signal: AbortSignal.timeout(8000) }
    )).text()
    // 新浪格式最后一个分号前的数据包含涨跌家数
    const lines = sh.split('\n')
    for (const line of lines) {
      const m = line.match(/="([^"]+)"/)
      if (m) {
        const parts = m[1].split(',')
        if (parts.length > 10) {
          // 上证指数: parts[0]=名称, parts[1]=今开, parts[2]=昨收, parts[3]=现价
          // 最后几个字段包含涨跌家数
          const last = parseInt(parts[parts.length - 1]) || 0
          const prev = parseInt(parts[parts.length - 2]) || 0
          if (last > 0 && prev > 0) {
            r.upCount = Math.max(r.upCount, prev)
            r.downCount = Math.max(r.downCount, last)
          }
        }
      }
    }
  } catch(e) {}

  // 3. 涨跌停（从东方财富涨停页面抓取 HTML 标题）
  try {
    const zt = await (await fetch(
      'https://data.eastmoney.com/stockdata/',
      { headers: H, signal: AbortSignal.timeout(8000) }
    )).text()
    // 从 HTML 中提取涨停数
    const m1 = zt.match(/涨停[\s\S]*?(\d+)/)
    if (m1) r.limitUp = parseInt(m1[1]) || 0
  } catch(e) {}

  // 4. 写回 GitHub
  const token = process.env.GH_TOKEN
  if (token && r.pool.length > 0) {
    try {
      const p = 'data/' + today + '.json'
      const u = 'https://api.github.com/repos/ponylin06/daily-recap/contents/' + p
      const A = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }
      const ex = await (await fetch(u, { headers: A })).json()
      if (ex.content) {
        const old = JSON.parse(Buffer.from(ex.content, 'base64').toString())
        if (r.upCount > 0) { old.upCount = r.upCount; old.downCount = r.downCount }
        if (r.limitUp > 0) { old.limitUp = r.limitUp; old.limitDown = r.limitDown }
        if (r.pool.length > 0) old.poolStatus = r.pool
        if (old.sentiment) {
          if (r.limitUp > 0) { old.sentiment.limitUp = r.limitUp; old.sentiment.limitDown = r.limitDown }
          if (r.upCount > 0) { old.sentiment.upCount = r.upCount; old.sentiment.downCount = r.downCount }
        }
        const c = Buffer.from(JSON.stringify(old, null, 2), 'utf-8').toString('base64')
        await fetch(u, { method: 'PUT', headers: A,
          body: JSON.stringify({ message: '补全 ' + today, content: c, sha: ex.sha, branch: 'main' })
        })
        r.committed = true
      }
    } catch(e) {}
  }

  res.status(200).json(r)
}
