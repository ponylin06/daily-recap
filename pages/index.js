import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Recap from '../components/Recap'
import Briefing from '../components/Briefing'
import Weekly from '../components/Weekly'
import { fetchLiveData } from '../lib/liveData'

function MainContent({ date, data, dates, setDate, view }) {
  if (!data && view === 'recap') return (
    <div className="text-center text-gray-500 py-20">
      <p className="text-lg mb-2">该日期暂无复盘数据</p>
    </div>
  )
  return (
    <div>
      {/* 日期选择器 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 overflow-x-auto">
        <span className="text-xs text-gray-500 mr-1">日期</span>
        {(dates || []).slice(-10).reverse().map(d => (
          <button key={d} onClick={() => { setDate(d) }}
            className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition font-medium ${
              date === d ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}>
            {d.slice(5)}
          </button>
        ))}
      </div>

      {view === 'briefing' ? <Briefing /> : view === 'weekly' ? <Weekly date={date} /> : <Recap data={data} />}
    </div>
  )
}

function Sidebar({ view, setView }) {
  return (
    <div className="w-44 flex-shrink-0 border-r border-gray-800 min-h-screen p-4 flex flex-col">
      <div className="mb-6 px-1">
        <h1 className="text-sm font-bold text-gray-200">每日复盘</h1>
        <p className="text-xs text-gray-600 mt-0.5">A股量化复盘系统</p>
      </div>

      <nav className="space-y-0.5 flex-1">
        {[
          ['recap','📊 复盘'],
          ['briefing','🌅 简报'],
          ['weekly','📈 周报'],
        ].map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition ${
              view === v ? 'bg-amber-500/15 text-amber-400 font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}>
            {label}
          </button>
        ))}
      </nav>

      <div className="text-xs text-gray-700 mt-auto pt-4 border-t border-gray-800">
        powered by arecap.asia
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
          setDate(d[d.length - 1])
          loadData(d[d.length - 1])
        }
      })
      .catch(() => setDate(new Date().toISOString().split('T')[0]))
  }, [])

  const loadData = useCallback(async (d) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/recap?date=${d}`)
      if (res.ok) {
        const json = await res.json()
        const today = new Date().toISOString().split('T')[0]
        setData(d === today ? await fetchLiveData(json) : json)
      } else { setData(null) }
    } catch { setData(null) }
    setLoading(false)
  }, [])

  useEffect(() => { if (date) loadData(date) }, [date, loadData])

  return (
    <>
      <Head>
        <title>每日复盘 {date || ''}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://cdn.tailwindcss.com" async/>
        <style>{`
          body { background: #0b0d12; color: #d1d5db; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; font-size: 14px; line-height: 1.6; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: #2a2d37; border-radius: 2px; }
          @media (max-width: 640px) {
            body { font-size: 13px; }
            .sidebar-desktop { display: none; }
            section { padding: 10px !important; margin-bottom: 6px !important; }
            th, td { padding: 3px 5px !important; font-size: 11px; }
          }
        `}</style>
      </Head>

      <div className="flex">
        <div className="sidebar-desktop"><Sidebar view={view} setView={setView} /></div>
        <div className="flex-1 min-w-0">
          {loading ? <div className="text-center text-gray-500 py-20">加载中...</div>
            : <MainContent date={date} data={data} dates={dates} setDate={setDate} view={view} />}
        </div>
      </div>
    </>
  )
}
