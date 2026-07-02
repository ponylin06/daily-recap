import { useState, useEffect } from 'react'

export default function Weekly() {
  const [d, setD] = useState(null)

  useEffect(() => {
    fetch('/api/weekly').then(r => r.json()).then(setD)
  }, [])

  if (!d) return <div className="text-center text-gray-500 py-20">加载中...</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-gray-200">📈 交易周报</h2>
        <p className="text-sm text-gray-500">{d.period}</p>
      </div>

      {/* 交易绩效 */}
      {d.totalTrades > 0 && (
        <section className="bg-[#1a1d27] border border-[#2a2d37] rounded-xl p-5 mb-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3">💰 交易绩效</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="总盈亏" value={d.totalPnL} color={String(d.totalPnL).startsWith('-') ? 'text-green-500' : 'text-red-400'} />
            <Stat label="胜率" value={d.winRate} />
            <Stat label="交易数" value={d.totalTrades} />
            <Stat label="胜/负" value={`${d.wins}/${d.losses}`} />
          </div>
        </section>
      )}

      {/* 市场概览 */}
      <section className="bg-[#1a1d27] border border-[#2a2d37] rounded-xl p-5 mb-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3">📊 本周市场</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="交易天数" value={d.tradingDays} />
          <Stat label="日均涨停" value={d.avgLimitUp} />
          <Stat label="日均跌停" value={d.avgLimitDown} />
        </div>
        {d.marketTrend?.length > 0 && (
          <div className="mt-3 space-y-1">
            {d.marketTrend.map((m, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-[#2a2d37] py-1">
                <span className="text-gray-400">{m.date.slice(5)}</span>
                <span className={`font-semibold ${String(m.chg).startsWith('-') ? 'text-green-500' : 'text-red-400'}`}>{m.chg}</span>
                <span className="text-gray-500">{m.vol}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 交易记录 */}
      {d.trades?.length > 0 && (
        <section className="bg-[#1a1d27] border border-[#2a2d37] rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-300 mb-3">📝 本周交易</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-1 px-2 text-xs text-gray-500">日期</th>
                  <th className="text-left py-1 px-2 text-xs text-gray-500">标的</th>
                  <th className="text-left py-1 px-2 text-xs text-gray-500">操作</th>
                  <th className="text-left py-1 px-2 text-xs text-gray-500">盈亏</th>
                </tr>
              </thead>
              <tbody>
                {d.trades.map((t, i) => (
                  <tr key={i} className="border-b border-[#22252e]">
                    <td className="py-1 px-2 text-gray-400 text-xs">{t.date?.slice(5)}</td>
                    <td className="py-1 px-2 text-gray-300">{t.stock}</td>
                    <td className={`py-1 px-2 ${t.action === '买入' ? 'text-red-400' : 'text-green-500'}`}>{t.action}</td>
                    <td className={`py-1 px-2 font-semibold ${String(t.pnl).startsWith('+') ? 'text-red-400' : 'text-green-500'}`}>{t.pnl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`font-bold text-sm ${color || 'text-gray-200'}`}>{value}</div>
    </div>
  )
}
