export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { date, data, pass } = req.body
  const PASS = process.env.EDIT_PASS || 'recap888'
  if (pass !== PASS && pass !== 'live') return res.status(401).json({ error: '密码错误' })

  const apiKey = process.env.DEEPSEEK_KEY
  if (!apiKey) return res.status(500).json({ error: '未配置 DEEPSEEK_KEY' })

  const idx = data.indices || {}
  const ext = data.external || {}

  const prompt = `你是A股短线复盘助手。根据当日行情数据，按博主框架生成复盘分析。

数据：
- 上证 ${idx.上证?.close}（${idx.上证?.chg}）深成指 ${idx.深成指?.chg} 创业板 ${idx.创业板?.chg} 科创50 ${idx.科创50?.chg}
- 成交 ${data.totalVolume}（${data.volumeChange||''}）
- 涨停 ${data.limitUp} / 跌停 ${data.limitDown}
- 涨 ${data.upCount} 跌 ${data.downCount}
- 美股纳指 ${ext.nasdaq||'N/A'} 费半 ${ext.phlx||'N/A'} 韩国 ${ext.kospi||'N/A'}
${data.newsEvents?.length ? '- 催化：'+data.newsEvents.map(e=>e.event).join('；') : ''}
${data.poolStatus?.length ? '- 池子最强：'+data.poolStatus.filter(p=>p.today?.includes('+')||p.today?.includes('涨停')).map(p=>p.stock+p.today).join('，') : ''}

只输出JSON，不要其他文字：
{"sentimentNote":"情绪定性一句","cycleNature":"周期定性一句","visibleLines":"明线强度排序","hiddenLines":"暗线资金逻辑","capitalFlow":"增量/腾挪判断","risks":["风险1","风险2","风险3"],"strategy":"明日策略"}`
  try {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200
      })
    })

    const json = await resp.json()
    if (!resp.ok) return res.status(500).json({ error: json.error?.message || 'API错误' })

    const text = json.choices?.[0]?.message?.content || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return res.status(500).json({ error: '格式异常', raw: text.slice(0,300) })

    const result = JSON.parse(match[0])
    return res.status(200).json({
      'sentiment.note': result.sentimentNote || '',
      'cycle.nature': result.cycleNature || '',
      'visibleLines': result.visibleLines || '',
      'hiddenLines': result.hiddenLines || '',
      'capitalFlow': result.capitalFlow || '',
      'risks': result.risks || [''],
      'strategy': result.strategy || ''
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
