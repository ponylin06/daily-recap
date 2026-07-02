import { useState, useEffect } from 'react'

export default function Briefing() {
  const [d, setD] = useState(null)

  useEffect(() => {
    fetch('/api/briefing').then(r => r.json()).then(setD)
  }, [])

  const [news, setNews] = useState({ china: [], global: [] })

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/recap?date=${today}`).then(r => r.json()).then(d => {
      if (!d.error) setNews({ china: d.news || [], global: d.globalNews || [] })
    }).catch(() => {})
  }, [])

  if (!d) return <div className="text-center text-gray-500 py-20">加载中...</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-gray-200">🌅 盘前简报 — {d.date}</h2>
      </div>

      {/* 隔夜外盘 */}
      <section className="bg-[#1a1d27] border border-[#2a2d37] rounded-xl p-5 mb-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3">🌍 隔夜外盘</h3>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(d.external || {}).map(([name, chg]) => (
            <div key={name} className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">{name}</div>
              <div className={`font-bold ${String(chg).startsWith('-') ? 'text-green-500' : 'text-red-400'}`}>{chg}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 今日关注 */}
      <section className="bg-[#1a1d27] border border-[#2a2d37] rounded-xl p-5 mb-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3">👀 今日关注方向</h3>
        <div className="space-y-2">
          {(d.watchList || []).map((w, i) => (
            <div key={i} className="flex items-start gap-2 border-b border-[#2a2d37] pb-2 last:border-0">
              <span className="text-amber-400 text-sm font-medium">{w.sector}</span>
              <span className="text-gray-400 text-xs flex-1">{w.reason}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 关键提醒 */}
      <section className="bg-[#1a1d27] border border-[#2a2d37] rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-300 mb-3">⚠️ 关键提醒</h3>
        <div className="space-y-1">
          {(d.keyEvents || []).map((e, i) => (
            <div key={i} className="text-sm text-gray-400">• {e}</div>
          ))}
        </div>
      </section>
      {/* 新闻 */}
      {(news.china.length > 0 || news.global.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {news.china.length > 0 && (
            <section className="bg-[#1a1d27] border border-red-500/30 rounded-xl p-5">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">🇨🇳</span>
                <span className="text-red-400">A股精选</span>
              </h3>
              <div className="space-y-2">
                {news.china.slice(0, 6).map((n, i) => (
                  <div key={i} className="border-b border-[#2a2d37] pb-2 last:border-0">
                    <a href={n.link} target="_blank" className="text-gray-300 text-sm hover:text-red-400">{n.title}</a>
                    <div className="text-gray-500 text-xs mt-0.5">{n.time}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {news.global.length > 0 && (
            <section className="bg-[#1a1d27] border border-blue-500/30 rounded-xl p-5">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">🌍</span>
                <span className="text-blue-400">全球宏观</span>
              </h3>
              <div className="space-y-2">
                {news.global.slice(0, 6).map((n, i) => (
                  <div key={i} className="border-b border-[#2a2d37] pb-2 last:border-0">
                    <a href={n.link} target="_blank" className="text-gray-300 text-sm hover:text-blue-400">{n.title}</a>
                    <div className="text-gray-500 text-xs mt-0.5">{n.time}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
