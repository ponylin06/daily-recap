// 盘前简报
export default async function handler(req, res) {
  const today = new Date().toISOString().split('T')[0]
  const result = { date: today, external: {}, keyEvents: [], watchList: [] }

  async function tx(code) {
    const r = await fetch(`https://qt.gtimg.cn/q=${code}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000)
    })
    if (!r.ok) return ''
    return r.text()
  }

  // 隔夜外盘
  for (const [code, name] of [['usIXIC','纳斯达克'],['usDJI','道琼斯'],['usSPX','标普500']]) {
    try {
      const t = await tx(code)
      const m = t.match(/(\d{4}-\d{2}-\d{2}[\s\d:]+)~([\d.-]+)~([\d.-]+)~/)
      if (m) result.external[name] = parseFloat(m[3]).toFixed(2) + '%'
    } catch {}
  }

  // 要关注的板块
  result.watchList = [
    { sector: '机器人', reason: '竞价是否有批量一字(雷赛/亚威)，稳科技场子' },
    { sector: '半导体设备', reason: '昨日上午主动带回流，是否率先止跌' },
    { sector: '电子特气', reason: '和远气体/争光股份主动性最强' },
    { sector: '医药', reason: '海南海药4板能否晋级，新旧题材博弈' }
  ]

  // 关键提醒
  result.keyEvents = [
    '双冰点+尾盘无抢筹=惯性杀后有反弹预期',
    '退一反一：反弹力度弱，不能期望连续修复',
    '竞价预估量能若>4.5万亿→分歧大→不急着出手',
    '海外链(CPO/光通信)退潮确认→相关品种不碰'
  ]

  res.setHeader('Cache-Control', 'public, max-age=300')
  res.status(200).json(result)
}
