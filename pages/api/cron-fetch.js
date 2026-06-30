export default async function handler(req, res) {
  const today = new Date().toISOString().split('T')[0]
  const result = { fetched: today, upCount: 0, downCount: 0, limitUp: 0, limitDown: 0, pool: [], committed: false }
  const BASE = 'https://push2.eastmoney.com/api/qt'
  const H = { 'User-Agent': 'Mozilla/5.0' }

  async function get(url) {
    const r = await fetch(url, { headers: H })
    if (!r.ok) return {}
    return r.json()
  }

  // 1. 涨跌家数
  try {
    const sh = await get(`${BASE}/stock/get?secid=1.000001&fields=f170,f171`)
    if (sh && sh.data) { result.upCount = sh.data.f170 || 0; result.downCount = sh.data.f171 || 0 }
  } catch(e) {}

  // 2. 涨跌停
  try {
    const lu = await get(`${BASE}/clt/get?fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fltt=2&np=1&pn=1&pz=1`)
    if (lu && lu.data) result.limitUp = lu.data.total || 0
  } catch(e) {}
  try {
    const ld = await get(`${BASE}/clt/get?fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fltt=2&downt=1&np=1&pn=1&pz=1`)
    if (ld && ld.data) result.limitDown = ld.data.total || 0
  } catch(e) {}

  // 3. 池子
  const POOL = [
    ['1.000636','风华高科'],['1.600176','中国巨石'],['1.603986','兆易创新'],
    ['0.000811','冰轮环境'],['1.605111','新洁能'],['0.600183','生益科技'],
  ]
  for (let i = 0; i < POOL.length; i++) {
    try {
      const d = await get(`${BASE}/stock/get?secid=${POOL[i][0]}&fields=f2,f3`)
      if (d && d.data) {
        const chg = d.data.f3 || 0
        let clr = '🟡'
        if (chg > 0) clr = '🟢'
        else if (chg < -5) clr = '🔴'
        result.pool.push({ status: clr, stock: POOL[i][1], today: chg.toFixed(2) + '%', close: d.data.f2 || '' })
      }
    } catch(e) {}
  }

  // 4. 写回 GitHub
  const token = process.env.GH_TOKEN
  if (token) {
    try {
      const p = 'data/' + today + '.json'
      const u = 'https://api.github.com/repos/ponylin06/daily-recap/contents/' + p
      const A = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }
      const existing = await (await fetch(u, { headers: A })).json()
      if (existing.content) {
        const old = JSON.parse(Buffer.from(existing.content, 'base64').toString())
        old.upCount = result.upCount
        old.downCount = result.downCount
        old.limitUp = result.limitUp
        old.limitDown = result.limitDown
        if (result.pool.length > 0) old.poolStatus = result.pool
        if (old.sentiment) {
          old.sentiment.limitUp = result.limitUp
          old.sentiment.limitDown = result.limitDown
          old.sentiment.upCount = result.upCount
          old.sentiment.downCount = result.downCount
        }
        const c = Buffer.from(JSON.stringify(old, null, 2), 'utf-8').toString('base64')
        await fetch(u, { method: 'PUT', headers: A,
          body: JSON.stringify({ message: 'Cron补全 ' + today, content: c, sha: existing.sha, branch: 'main' })
        })
        result.committed = true
      }
    } catch(e) {}
  }

  res.status(200).json(result)
}
