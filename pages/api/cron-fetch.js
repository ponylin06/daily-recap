export default async function handler(req, res) {
  const today = new Date().toISOString().split('T')[0]
  const r = { fetched: today, pool: [], committed: false }

  const POOL = [
    ['sh600176','中国巨石'],['sh603986','兆易创新'],['sz000811','冰轮环境'],
    ['sh605111','新洁能'],['sh600183','生益科技'],['sz000636','风华高科'],
    ['sz002384','东山精密'],['sz002281','光迅科技'],
  ]

  for (let i = 0; i < POOL.length; i++) {
    try {
      const resp = await fetch('https://qt.gtimg.cn/q=' + POOL[i][0], {
        headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000)
      })
      if (!resp.ok) continue
      const t = await resp.text()
      const parts = t.split('~')
      const price = parseFloat(parts[3]) || 0
      const m = t.match(/(\d{14})~(-?[\d.]+)~(-?[\d.]+)~/)
      const chg = m ? parseFloat(m[3]) : 0
      let clr = '🟡'
      if (chg > 0) clr = '🟢'
      if (chg < -5) clr = '🔴'
      r.pool.push({ status: clr, stock: POOL[i][1], today: chg.toFixed(2) + '%', close: price })
    } catch(e) {}
  }

  // 写回 GitHub
  const token = process.env.GH_TOKEN
  if (token && r.pool.length > 0) {
    try {
      const p = 'data/' + today + '.json'
      const u = 'https://api.github.com/repos/ponylin06/daily-recap/contents/' + p
      const A = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }
      const ex = await (await fetch(u, { headers: A })).json()
      if (ex.content) {
        const old = JSON.parse(Buffer.from(ex.content, 'base64').toString())
        // 只更新池子，不动其他字段
        if (r.pool.length > 0) old.poolStatus = r.pool
        const c = Buffer.from(JSON.stringify(old, null, 2), 'utf-8').toString('base64')
        await fetch(u, { method: 'PUT', headers: A,
          body: JSON.stringify({ message: '池子行情 ' + today, content: c, sha: ex.sha, branch: 'main' })
        })
        r.committed = true
      }
    } catch(e) {}
  }

  res.status(200).json(r)
}
