import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Recap from '../components/Recap'
import Briefing from '../components/Briefing'
import Weekly from '../components/Weekly'
import { fetchLiveData } from '../lib/liveData'

function MainContent({ date, data, view }) {
  if (!data && view === 'recap') return (
    <div className="text-center text-gray-500 py-20">
      <p className="text-lg mb-2">该日期暂无复盘数据</p>
    </div>
  )
  if (view === 'briefing') return <Briefing />
  if (view === 'weekly') return <Weekly date={date} />
  return <Recap data={data} />
}

function Sidebar({ dates, date, setDate, view, setView }) {
  return (
    <div className="w-48 flex-shrink-0 border-r border-gray-800 min-h-screen p-4">
      <h1 className="text-sm font-bold text-gray-200 mb-4 px-2">📊 每日复盘</h1>

      {/* 导航 */}
      <div className="space-y-1 mb-4">
        {[
          ['recap','📊 复盘'],
          ['briefing','🌅 简报'],
          ['weekly','📈 周报'],
        ].map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            className={`w-full text-left px-2 py-1.5 text-xs rounded-md font-medium transition ${
              view === v ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* 日期选择 */}
      <div className="text-xs text-gray-500 mb-1 px-2 mt-6">历史复盘</div>
      <div className="space-y-0.5 max-h-[50vh] overflow-y-auto">
        {(dates || []).slice().reverse().map(d => (
          <button key={d} onClick={() => { setDate(d); setView('recap') }}
            className={`w-full text-left px-2 py-1 rounded text-xs transition ${
              date === d && view === 'recap' ? 'bg-white/10 text-gray-200' : 'text-gray-500 hover:text-gray-300'
            }`}>
            {d.slice(5)}
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-600 mt-6 px-2">
        <a href="/edit" className="hover:text-gray-400">✏️ 编辑</a>
      </div>
    </div>
  )
}

export default function Home() {
  const [date, setDate] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dates, setDates] = useState([])
  const [view, setView] = useState('recap')

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view')
    if (v) setView(v)
  }, [])

  useEffect(() => {
    fetch('/api/dates')
      .then(r => r.json())
      .then(d => {
        setDates(d)
        if (d.length > 0) {
          const latest = d[d.length - 1]
          setDate(latest)
          loadData(latest)
        } else {
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
        const today = new Date().toISOString().split('T')[0]
        if (d === today) {
          const live = await fetchLiveData(json)
          setData(live)
        } else {
          setData(json)
        }
      } else { setData(null) }
    } catch { setData(null) }
    setLoading(false)
  }, [])

  useEffect(() => { if (date) loadData(date) }, [date, loadData])

  return (
    <>
      <Head>
        <title>每日复盘 {date ? `— ${date}` : ''}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://cdn.tailwindcss.com" async></script>
        <style>{`
          body { background: #0f1117; color: #d1d5db; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; font-size: 14px; }
          @media (min-width: 1024px) { body { font-size: 14px; } }
          @media (max-width: 640px) {
            body { font-size: 13px; }
            .sidebar { display: none; }
            section { padding: 10px !important; margin-bottom: 6px !important; }
            th, td { padding: 3px 5px !important; font-size: 11px; }
          }
        `}</style>
      </Head>

      <div className="flex">
        <Sidebar dates={dates} date={date} setDate={setDate} view={view} setView={setView} />

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="text-center text-gray-500 py-20">加载中...</div>
          ) : (
            <MainContent date={date} data={data} view={view} />
          )}
        </div>
      </div>
    </>
  )
}
