// 腾讯行情代理 — 浏览器 → Vercel → 腾讯
export default async function handler(req, res) {
  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'missing code' })
  try {
    const r = await fetch(`https://qt.gtimg.cn/q=${code}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000)
    })
    if (!r.ok) return res.status(502).json({ error: 'upstream error' })
    const text = await r.text()
    res.status(200).send(text)
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
}
