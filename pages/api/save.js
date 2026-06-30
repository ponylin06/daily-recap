const PASS = process.env.EDIT_PASS || 'recap888'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { date, data, pass } = req.body
  if (!date || !data) return res.status(400).json({ error: '缺少 date 或 data' })
  if (pass !== PASS) return res.status(401).json({ error: '密码错误' })

  const token = process.env.GH_TOKEN
  const owner = 'ponylin06'
  const repo = 'daily-recap'
  const path = `data/${date}.json`

  try {
    // 先获取当前文件（获取 sha 才能更新）
    const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
    })
    const existing = await getRes.json()
    const sha = existing.sha

    // 更新文件
    const content = Buffer.from(JSON.stringify(data, null, 2), 'utf-8').toString('base64')
    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      body: JSON.stringify({
        message: `✏️ 手动更新 ${date} 复盘`,
        content, sha, branch: 'main'
      })
    })

    if (!putRes.ok) {
      const err = await putRes.json()
      return res.status(500).json({ error: err.message || 'GitHub API 错误' })
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
