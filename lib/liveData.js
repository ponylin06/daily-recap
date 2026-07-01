// 浏览器端实时抓取腾讯行情
// 用法: import { fetchLiveData } from '../lib/liveData'

const INDEX_MAP = {
  '上证': 'sh000001', '深成指': 'sz399001', '创业板': 'sz399006',
  '科创50': 'sh000688', '北证50': 'bj899050'
}

const US_MAP = {
  '纳斯达克': 'usIXIC', '道琼斯': 'usDJI', '标普500': 'usSPX'
}

const POOL_TX = {
  '风华高科':'sz000636','中国巨石':'sh600176','兆易创新':'sh603986',
  '冰轮环境':'sz000811','新洁能':'sh605111','生益科技':'sh600183',
  '东山精密':'sz002384','光迅科技':'sz002281',
}

async function txFetch(code) {
  try {
    const r = await fetch(`https://qt.gtimg.cn/q=${code}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (!r.ok) return null
    return await r.text()
  } catch { return null }
}

function parseIndex(raw) {
  // "上证指数,4094.40,20.50,0.50,5984122,153032596"
  const parts = raw.split(',')
  if (parts.length < 4) return null
  return {
    close: parseFloat(parts[1]) || 0,
    chg: (parseFloat(parts[3]) || 0).toFixed(2) + '%'
  }
}

function parseStock(raw) {
  // ~现价(parts[3])~...~时间戳~涨跌额~涨跌幅~
  const m = raw.match(/(\d{14})~(-?[\d.]+)~(-?[\d.]+)~/)
  if (!m) return null
  const parts = raw.split('~')
  return {
    close: parseFloat(parts[3]) || 0,
    chg: parseFloat(m[3]) || 0
  }
}

export async function fetchLiveData(existingData) {
  const d = JSON.parse(JSON.stringify(existingData || {}))

  // 指数实时数据
  if (d.indices) {
    for (const [name, code] of Object.entries(INDEX_MAP)) {
      const raw = await txFetch(code)
      if (raw) {
        const parsed = parseIndex(raw)
        if (parsed && parsed.close > 0) {
          d.indices[name] = { ...d.indices[name], ...parsed }
        }
      }
    }
  }

  // 美股
  if (d.external) {
    for (const [name, code] of Object.entries(US_MAP)) {
      const raw = await txFetch(code)
      if (raw) {
        const parsed = parseStock(raw)
        if (parsed) {
          if (name === '纳斯达克') d.external.nasdaq = parsed.chg.toFixed(2) + '%'
        }
      }
    }
  }

  // 池子行情
  const pool = []
  for (const [name, code] of Object.entries(POOL_TX)) {
    const raw = await txFetch(code)
    if (raw) {
      const parsed = parseStock(raw)
      if (parsed && parsed.close > 0) {
        let clr = '🟡'
        if (parsed.chg > 0) clr = '🟢'
        if (parsed.chg < -5) clr = '🔴'
        pool.push({ status: clr, stock: name, today: parsed.chg.toFixed(2) + '%', close: parsed.close })
      }
    }
  }
  if (pool.length > 0) d.poolStatus = pool

  d._liveUpdated = new Date().toISOString()
  return d
}
