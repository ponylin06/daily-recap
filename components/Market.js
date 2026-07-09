import { useState, useEffect } from 'react'

const INDICES = [
  { code: 'sh000001', name: '上证指数', market: '🇨🇳 A股' },
  { code: 'sz399001', name: '深证成指', market: '🇨🇳 A股' },
  { code: 'sz399006', name: '创业板指', market: '🇨🇳 A股' },
  { code: 'sh000688', name: '科创50', market: '🇨🇳 A股' },
  { code: 'usIXIC', name: '纳斯达克', market: '🇺🇸 美股' },
  { code: 'usDJI', name: '道琼斯', market: '🇺🇸 美股' },
  { code: 'usSPX', name: '标普500', market: '🇺🇸 美股' },
]

const STOCKS = [
  { code: 'sh600176', name: '中国巨石', tag: '持仓' },
  { code: 'sh603986', name: '兆易创新', tag: '存储' },
  { code: 'sz000811', name: '冰轮环境', tag: '液冷' },
  { code: 'sh605111', name: '新洁能', tag: '功率半导体' },
  { code: 'sz000636', name: '风华高科', tag: 'MLCC' },
  { code: 'sh600584', name: '长电科技', tag: '先进封装' },
  { code: 'sz002384', name: '东山精密', tag: 'PCB' },
  { code: 'sz002281', name: '光迅科技', tag: '光通信' },
]

export default function Market() {
  const [indices, setIndices] = useState([])
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const all = []
      // 指数
      for (const item of INDICES) {
        try {
          const r = await fetch(`/api/live?code=${item.code}`)
          const t = await r.text()
          const parts = t.split('~')
          const price = parseFloat(parts[3]) || 0
          const m = t.match(/(\d{14}~[\d.-]+~[\d.-]+~|[\d\s-:]+~[\d.-]+~[\d.-]+~)/)
          let chg = 0
          if (m) { const pcs = m[0].split('~'); chg = parseFloat(pcs[pcs.length-2]) || 0 }
          all.push({ type:'index', ...item, price, chg })
        } catch {}
      }
      setIndices(all.filter(x => x.price > 0))

      // 个股
      const stockData = []
      for (const item of STOCKS) {
        try {
          const r = await fetch(`/api/live?code=${item.code}`)
          const t = await r.text()
          const parts = t.split('~')
          const price = parseFloat(parts[3]) || 0
          const m = t.match(/(\d{14})~(-?[\d.]+)~(-?[\d.]+)~/)
          const chg = m ? parseFloat(m[3]) : 0
          stockData.push({ type:'stock', ...item, price, chg })
        } catch {}
      }
      setStocks(stockData)
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 30000) // 30秒刷新
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="text-center text-gray-500 py-20">加载中...</div>

  return (
    <div className="px-4 py-4 md:px-6">
      <h2 className="text-sm font-bold text-gray-200 mb-4">📈 市场看板</h2>

      {/* 指数 */}
      <div className="mb-6">
        <h3 className="text-xs text-gray-500 mb-2">主要指数</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {indices.map((item, i) => (
            <div key={i} className="bg-[#12151c] border border-[#1e2230] rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{item.name}</span>
                <span className="text-xs text-gray-600">{item.market}</span>
              </div>
              <div className="text-lg font-bold text-gray-100">{item.price.toFixed(2)}</div>
              <div className={`text-xs font-semibold ${item.chg >= 0 ? 'text-red-400' : 'text-green-500'}`}>
                {item.chg >= 0 ? '+' : ''}{item.chg.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 个股 */}
      <div>
        <h3 className="text-xs text-gray-500 mb-2">关注个股</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stocks.map((item, i) => (
            <div key={i} className={`bg-[#12151c] border rounded-lg p-3 ${item.tag === '持仓' ? 'border-amber-500/30' : 'border-[#1e2230]'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-300">{item.name}</span>
                <span className="text-xs text-gray-600">{item.tag}</span>
              </div>
              <div className="text-lg font-bold text-gray-100">{item.price > 1 ? item.price.toFixed(2) : item.price.toFixed(3)}</div>
              <div className={`text-xs font-semibold ${item.chg >= 0 ? 'text-red-400' : 'text-green-500'}`}>
                {item.chg >= 0 ? '+' : ''}{item.chg.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-700 mt-6">数据：腾讯行情 · 30秒自动刷新</p>
    </div>
  )
}
