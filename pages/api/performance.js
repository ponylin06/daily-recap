// 交易绩效聚合 — 读取所有复盘日期的调仓记录
import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  const dataDir = path.join(process.cwd(), 'data')
  const stats = { trades: [], totalPnL: 0, wins: 0, losses: 0, best: null, worst: null }

  try {
    const files = fs.readdirSync(dataDir).filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/)).sort()
    for (const f of files) {
      const d = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf-8'))
      if (!d.trades) continue
      for (const t of d.trades) {
        const pnlVal = parseFloat(String(t.pnl).replace('%','').replace('+','')) || 0
        stats.trades.push({ ...t, date: d.date, pnlVal })
        stats.totalPnL += pnlVal
        if (pnlVal > 0) stats.wins++
        else stats.losses++
        if (!stats.best || pnlVal > stats.best.pnlVal) stats.best = { ...t, date: d.date, pnlVal }
        if (!stats.worst || pnlVal < stats.worst.pnlVal) stats.worst = { ...t, date: d.date, pnlVal }
      }
    }
  } catch {}

  const total = stats.trades.length
  stats.winRate = total > 0 ? (stats.wins / total * 100).toFixed(0) + '%' : 'N/A'
  stats.totalPnL = stats.totalPnL.toFixed(1) + '%'
  stats.totalTrades = total

  res.setHeader('Cache-Control', 'public, max-age=300')
  res.status(200).json(stats)
}
