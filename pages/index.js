import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Recap from '../components/Recap'
import { fetchLiveData } from '../lib/liveData'

export default function Home() {
  const [date, setDate] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dates, setDates] = useState([])

  useEffect(() => {
    // 获取所有可用的复盘日期
    fetch('/api/dates')
      .then(r => r.json())
      .then(d => {
        setDates(d)
        if (d.length > 0) {
          const latest = d[d.length - 1]
          setDate(latest)
          loadData(latest)
        } else {
          // fallback to today
          const today = new Date().toISOString().split('T')[0]
          setDate(today)
        }
      })
      .catch(() => {
        const today = new Date().toISOString().split('T')[0]
        setDate(today)
      })
  }, [])

  const loadData = useCallback(async (d) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/recap?date=${d}`)
      if (res.ok) {
        const json = await res.json()
        // 只在今天才用腾讯实时数据覆盖，历史数据不动
        const today = new Date().toISOString().split('T')[0]
        if (d === today) {
          const live = await fetchLiveData(json)
          setData(live)
        } else {
          setData(json)
        }
      } else {
        setData(null)
      }
    } catch {
      setData(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (date) loadData(date)
  }, [date, loadData])

  return (
    <>
      <Head>
        <title>每日复盘 {date ? `— ${date}` : ''}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          body { background: #0f1117; color: #d1d5db; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; }
        `}</style>
        <script src="https://cdn.tailwindcss.com" async></script>
        <script dangerouslySetInnerHTML={{ __html: `
          tailwind.config = {
            theme: { extend: { colors: { gray: { 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827' } } } }
          }
        `}} />
      </Head>

      <header className="text-center py-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-gray-200">📊 每日复盘 — {date || '加载中...'}</h1>

        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => {
              const idx = dates.indexOf(date)
              if (idx > 0) setDate(dates[idx - 1])
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
          >
            ← 前日
          </button>

          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 text-gray-200 border border-gray-700 focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
          >
            {dates.length === 0 && <option value={date}>{date}</option>}
            {dates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <button
            onClick={() => {
              const idx = dates.indexOf(date)
              if (idx < dates.length - 1) setDate(dates[idx + 1])
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
          >
            后日 →
          </button>
        </div>
      </header>

      {loading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : data ? (
        <Recap data={data} />
      ) : (
        <div className="text-center text-gray-500 py-20">
          <p className="text-lg mb-2">该日期暂无复盘数据</p>
          <p className="text-sm">在 data/ 目录下创建 {date}.json 即可</p>
        </div>
      )}
    </>
  )
}
