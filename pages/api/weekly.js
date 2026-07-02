// 周度/月度汇总
import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  const dataDir = path.join(process.cwd(), 'data')
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1) // Monday

  const summary = {
    period: `${weekStart.toISOString().split('T')[0]} ~ ${now.toISOString().split('T')[0]}`,
    trades: [], totalPnL: 0, wins: 0, losses: 0, bestDay: null, worstDay: null,
    avgLimitUp: 0, avgLimitDown: 0, marketTrend: []
  }

  try {
    const files = fs.readdirSync(dataDir).filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/)).sort()
    let limitUpSum = 0, limitDownSum = 0, volSum = 0, count = 0

    for (const f of files) {
      const d = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf-8'))
      const fileDate = f.replace('.json','')
      if (fileDate < weekStart.toISOString().split('T')[0]) continue

      // 市场数据汇总
      if (d.limitUp && d.limitDown) {
        limitUpSum += d.limitUp
        limitDownSum += d.limitDown
        count++
        if (d.indices?.上证?.chg) {
          summary.marketTrend.push({ date: fileDate, chg: d.indices.上证.chg, vol: d.totalVolume })
        }
      }

      // 交易汇总
      if (d.trades) {
        for (const t of d.trades) {
          const pnlVal = parseFloat(String(t.pnl).replace('%','').replace('+','')) || 0
          summary.trades.push({ ...t, date: fileDate, pnlVal })
          summary.totalPnL += pnlVal
          if (pnlVal > 0) summary.wins++
          else summary.losses++
        }
      }
    }

    summary.avgLimitUp = count > 0 ? Math.round(limitUpSum / count) : 0
    summary.avgLimitDown = count > 0 ? Math.round(limitDownSum / count) : 0
    summary.tradingDays = count
    const total = summary.trades.length
    summary.winRate = total > 0 ? (summary.wins / total * 100).toFixed(0) + '%' : 'N/A'
    summary.totalPnL = summary.totalPnL.toFixed(1) + '%'
    summary.totalTrades = total
  } catch {}

  res.setHeader('Cache-Control', 'public, max-age=600')
  res.status(200).json(summary)
}
