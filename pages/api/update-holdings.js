// 更新持仓：接受买卖指令，自动写入 GitHub
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const { pass, action, stock, code, cost, shares } = req.body
  if (pass !== (process.env.EDIT_PASS || 'recap888')) return res.status(401).json({ error: '密码错误' })

  const token = process.env.GH_TOKEN
  if (!token) return res.status(500).json({ error: '未配置 GH_TOKEN' })
  const A = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }

  try {
    // 读取当前持仓
    const getReq = await fetch('https://api.github.com/repos/ponylin06/daily-recap/contents/data/holdings.json', { headers: A })
    const ex = await getReq.json()
    const current = ex.content ? JSON.parse(Buffer.from(ex.content, 'base64').toString()) : { holdings: [] }

    if (action === 'buy') {
      current.holdings.push({ stock, code, cost, shares })
    } else if (action === 'sell') {
      current.holdings = current.holdings.filter(h => h.stock !== stock)
    }

    const c = Buffer.from(JSON.stringify(current, null, 2), 'utf-8').toString('base64')
    await fetch('https://api.github.com/repos/ponylin06/daily-recap/contents/data/holdings.json', {
      method: 'PUT', headers: A,
      body: JSON.stringify({ message: `持仓: ${action} ${stock}`, content: c, sha: ex.sha, branch: 'main' })
    })

    return res.status(200).json({ ok: true, holdings: current.holdings })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
