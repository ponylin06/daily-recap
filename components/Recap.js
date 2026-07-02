import { useState, useEffect, useCallback } from 'react'

// A股规则：红涨绿跌。利好=红，利空=绿。
const Up = ({ children }) => <span className="text-red-400 font-semibold">{children}</span>
const Down = ({ children }) => <span className="text-green-500">{children}</span>
const Warn = ({ children }) => <span className="text-yellow-400">{children}</span>

const RISE_COLOR = 'text-red-400 font-semibold'
const FALL_COLOR = 'text-green-500'

function chgColor(v) {
  if (!v) return ''
  const s = String(v)
  if (s.startsWith('+') || s.includes('涨停') || s.includes('领涨') || s.includes('走强')) return RISE_COLOR
  if (s.startsWith('-') || s.includes('跌停') || s.includes('大跌') || s.includes('领跌') || s.includes('走弱')) return FALL_COLOR
  return ''
}

function Section({ num, title, children }) {
  return (
    <section className="bg-[#1a1d27] border border-[#2a2d37] rounded-xl p-5 mb-4">
      <h2 className="text-base font-bold text-gray-200 mb-3 flex items-center gap-2">
        <span className="bg-amber-500 text-black text-xs px-2 py-0.5 rounded-full font-bold">{num}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function DataTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left py-2 px-3 text-xs text-gray-400 font-medium border-b border-[#2a2d37]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[#22252e]">
              {row.map((cell, j) => (
                <td key={j} className={`py-2 px-3 text-gray-300 ${chgColor(cell)}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatBlock({ label, value, color }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 text-center">
      <div className="text-gray-500 text-xs">{label}</div>
      <div className={`font-semibold ${color || 'text-gray-200'}`}>{value}</div>
    </div>
  )
}

function AlertsBanner({ data }) {
  const alerts = []
  const ext = data.external || {}
  const kc = data.indices?.['科创50']
  const lu = data.limitUp || 0
  const ld = data.limitDown || 0
  const vol = data.totalVolume || ''

  // 韩国暴跌
  const kospi = ext.kospi || ''
  const kospiVal = parseFloat(kospi) || 0
  if (kospiVal < -5) alerts.push({ icon: '🔴', text: `韩国暴跌${kospi}，外围系统性风险` })
  else if (kospiVal < -3) alerts.push({ icon: '🟡', text: `韩国${kospi}，外围偏弱` })

  // 涨停极端
  if (lu > 200) alerts.push({ icon: '🟡', text: `涨停${lu}只=高潮日，次日分化不接力` })
  else if (lu < 80) alerts.push({ icon: '🔴', text: `涨停仅${lu}只=短线冰点，控制仓位` })

  // 跌停
  if (ld > 60) alerts.push({ icon: '🔴', text: `跌停${ld}只，亏钱效应扩散` })

  // 科创50
  const kcChg = parseFloat(kc?.chg) || 0
  if (kcChg < -5) alerts.push({ icon: '🔴', text: `科创50${kc?.chg}，科技恐慌性杀跌` })
  else if (kcChg < -3) alerts.push({ icon: '🟡', text: `科创50${kc?.chg}，科技承压注意风险` })
  else if (kcChg > 3) alerts.push({ icon: '🟢', text: `科创50${kc?.chg}，科技强势修复` })

  // 成交额
  if (vol.includes('3.8') || vol.includes('3.9') || vol.includes('4')) alerts.push({ icon: '🟡', text: `成交${vol}，逼近4万亿高潮预警` })

  if (alerts.length === 0) return null

  return (
    <div className="mb-4 space-y-1">
      {alerts.map((a, i) => (
        <div key={i} className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: a.icon === '🔴' ? 'rgba(239,68,68,0.12)' : a.icon === '🟡' ? 'rgba(234,179,8,0.12)' : 'rgba(34,197,94,0.12)',
                   color: a.icon === '🔴' ? '#fca5a5' : a.icon === '🟡' ? '#fde68a' : '#86efac',
                   border: '1px solid ' + (a.icon === '🔴' ? 'rgba(239,68,68,0.3)' : a.icon === '🟡' ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)') }}>
          {a.icon} {a.text}
        </div>
      ))}
    </div>
  )
}

function PerformanceSection() {
  const [p, setP] = useState(null)
  useEffect(() => {
    fetch('/api/performance').then(r => r.json()).then(setP)
  }, [])
  if (!p || p.totalTrades === 0) return null
  return (
    <details className="mb-4 opacity-80 hover:opacity-100 transition">
      <summary className="text-sm text-gray-400 cursor-pointer py-2">📈 交易绩效（{p.totalTrades}笔）</summary>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 p-4 bg-[#1a1d27] rounded-xl border border-[#2a2d37]">
        <div className="text-center">
          <div className="text-xs text-gray-500">总盈亏</div>
          <div className={`font-bold ${String(p.totalPnL).startsWith('-')?'text-green-500':'text-red-400'}`}>{p.totalPnL}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">胜率</div>
          <div className="text-gray-200 font-bold">{p.winRate}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">最佳</div>
          <div className="text-red-400 font-bold text-sm">{p.best?.pnl} {p.best?.stock}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">最差</div>
          <div className="text-green-500 font-bold text-sm">{p.worst?.pnl} {p.worst?.stock}</div>
        </div>
      </div>
    </details>
  )
}

function HoldingsSection() {
  const [h, setH] = useState([])

  useEffect(() => {
    fetch('/api/holdings')
      .then(r => r.json())
      .then(async d => {
        const items = []
        for (const item of (d.holdings || [])) {
          try {
            const r = await fetch(`/api/live?code=${item.code}`)
            const t = await r.text()
            const parts = t.split('~')
            const price = parseFloat(parts[3]) || 0
            const m = t.match(/(\d{14})~(-?[\d.]+)~(-?[\d.]+)~/)
            const chg = m ? parseFloat(m[3]) : 0
            const pnl = ((price - item.cost) / item.cost * 100)
            items.push({ ...item, price, chg, pnl })
          } catch { items.push(item) }
        }
        setH(items)
      })
  }, [])

  // 数据没到齐之前不显示
  const ready = h.length > 0 && h[0].price !== undefined
  if (!ready) return null

  return (
    <section className="bg-[#1a1d27] border border-amber-500/30 rounded-xl p-5 mb-4">
      <h2 className="text-base font-bold mb-3 flex items-center gap-2">
        <span className="bg-amber-500 text-black text-xs px-2 py-0.5 rounded-full font-bold">📌</span>
        <span className="text-amber-400">我的持仓</span>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium border-b border-[#2a2d37]">标的</th>
              <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium border-b border-[#2a2d37]">成本</th>
              <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium border-b border-[#2a2d37]">现价</th>
              <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium border-b border-[#2a2d37]">涨跌</th>
              <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium border-b border-[#2a2d37]">浮盈</th>
            </tr>
          </thead>
          <tbody>
            {h.map((item, i) => (
              <tr key={i} className="border-b border-[#22252e]">
                <td className="py-2 px-3 text-gray-300">{item.stock}</td>
                <td className="py-2 px-3 text-gray-400">{item.cost}</td>
                <td className={`py-2 px-3 ${item.chg > 0 ? 'text-red-400' : item.chg < 0 ? 'text-green-500' : 'text-gray-300'}`}>
                  {item.price || '-'}
                </td>
                <td className={`py-2 px-3 font-semibold ${item.chg > 0 ? 'text-red-400' : item.chg < 0 ? 'text-green-500' : 'text-gray-300'}`}>
                  {item.chg ? (item.chg > 0 ? '+' : '') + item.chg.toFixed(2) + '%' : '-'}
                </td>
                <td className={`py-2 px-3 font-semibold ${item.pnl > 0 ? 'text-red-400' : item.pnl < 0 ? 'text-green-500' : 'text-gray-300'}`}>
                  {item.pnl ? (item.pnl > 0 ? '+' : '') + item.pnl.toFixed(2) + '%' : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function Recap({ data, onDataUpdate }) {
  if (!data) return <div className="text-center text-gray-500 py-20">未找到该日期的复盘数据</div>
  const [d, setD] = useState(data)
  useEffect(() => { setD(data) }, [data])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMsg, setAiMsg] = useState('')
  const [aiDone, setAiDone] = useState(false)

  const handleLiveAI = useCallback(async () => {
    setAiLoading(true); setAiMsg('')
    try {
      const r = await fetch('/api/ai-draft', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ data: d, pass: 'live' })
      })
      const res = await r.json()
      if (res.error) { setAiMsg('AI: '+res.error); setAiLoading(false); return }
      if (res.visibleLines) d.visibleLines = res.visibleLines
      if (res.hiddenLines) d.hiddenLines = res.hiddenLines
      if (res.capitalFlow) d.capitalFlow = res.capitalFlow
      if (res.strategy) d.strategy = res.strategy
      if (res['sentiment.note']) { d.sentiment = d.sentiment || {}; d.sentiment.note = res['sentiment.note'] }
      if (res['cycle.nature']) { d.cycle = d.cycle || {}; d.cycle.nature = res['cycle.nature'] }
      if (res.risks) d.risks = res.risks
      setAiMsg('✅ 分析已生成')
      const updated = JSON.parse(JSON.stringify(d))
      setD(updated)
    } catch { setAiMsg('AI生成失败') }
    setAiLoading(false)
  }, [d])

  // 自动触发AI分析（如果数据缺分析）
  useEffect(() => {
    if (aiDone || aiLoading) return
    const hasAnalysis = d.strategy && d.strategy.length > 10 && d.visibleLines && d.visibleLines.length > 10
    if (!hasAnalysis && d.indices && d.indices['上证']?.close > 0) {
      setAiDone(true)
      handleLiveAI()
    } else if (hasAnalysis) {
      setAiDone(true)
    }
  }, [d, aiDone, aiLoading, handleLiveAI])

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">

      {/* AI自动分析：页面加载时若缺分析则自动生成 */}
      {aiMsg && <div className="text-center mb-2"><span className="text-xs" style={{color: aiMsg.includes('✅')?'#fca5a5':'#9ca3af'}}>{aiMsg}</span></div>}

      {/* 智能警报 */}
      <AlertsBanner data={d} />

      {/* 1. 外围速览 */}
      <Section num={1} title="外围速览">
        <DataTable
          headers={['市场', '表现', '对A股传导']}
          rows={[
            ['美股纳指', d.external?.nasdaq || '—', <span className={String(d.external?.nasdaq||'').startsWith('-')?FALL_COLOR:RISE_COLOR}>{d.external?.nasdaq||'—'}</span>],
            ['费城半导体', d.external?.phlx || '—', ''],
            ['韩国KOSPI', d.external?.kospi || '—', ''],
            ['日经225', d.external?.nikkei || '—', ''],
          ]}
        />
        <p className="text-sm text-gray-400 mt-2">{d.external?.note}</p>
      </Section>

      {/* 2. 盘面总览 */}
      <Section num={2} title="盘面总览">
        <DataTable
          headers={['指数', '收盘', '涨跌幅', '成交额(亿)', '特征']}
          rows={Object.entries(d.indices || {}).map(([name, v]) => [
            name, v.close,
            <span className={String(v.chg).startsWith('-') ? FALL_COLOR : RISE_COLOR}>{v.chg}</span>,
            v.vol, ''
          ])}
        />
        <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
          <StatBlock label="成交额" value={d.totalVolume && d.totalVolume !== '待刷新' ? d.totalVolume : '—'} />
          <StatBlock label="上涨" value={d.upCount || '—'} color={d.upCount ? 'text-red-400' : ''} />
          <StatBlock label="下跌" value={d.downCount || '—'} color={d.downCount ? 'text-green-500' : ''} />
          <StatBlock label="涨停" value={d.limitUp || '—'} color={d.limitUp ? 'text-red-400' : ''} />
          <StatBlock label="跌停" value={d.limitDown || '—'} color={d.limitDown ? 'text-green-500' : ''} />
          <StatBlock label="封板率" value={d.boardRate} />
        </div>
      </Section>

      {/* 3. 内外因博弈 */}
      <Section num={3} title="内外因博弈">
        <DataTable
          headers={['时期', '内因', '外因', '结果']}
          rows={(d.internalExternal || []).map(e => [e.period, e.internal, e.external, e.result])}
        />
      </Section>

      {/* 4. 外部消息 */}
      <Section num={4} title="外部因素与盘中消息">
        <DataTable
          headers={['事件', '影响', '映射板块', '今日表现']}
          rows={(d.newsEvents || []).map(e => [
            e.event,
            <span className={e.impact?.includes('利好') || e.impact?.includes('真实') ? RISE_COLOR : (e.impact?.includes('利空') ? FALL_COLOR : '')}>{e.impact}</span>,
            e.sector, e.performance
          ])}
        />
      </Section>

      {/* 5. 周期定位 */}
      <Section num={5} title="周期定位">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white/5 rounded-lg p-3"><span className="text-gray-500">阶段</span> <span className="text-amber-400 ml-2 font-semibold">{d.cycle?.stage}</span></div>
          <div className="bg-white/5 rounded-lg p-3"><span className="text-gray-500">拐点</span> <span className="text-gray-200 ml-2">{d.cycle?.pivot}，第{d.cycle?.days}天</span></div>
        </div>
        <p className="text-sm text-gray-400 mt-2">{d.cycle?.nature}</p>
      </Section>

      {/* 6. 技术锚 */}
      <Section num={6} title="指数技术锚">
        <DataTable
          headers={['锚点', '位置', '状态', '含义']}
          rows={(d.techAnchors || []).map(a => [a.anchor, a.position, <span className={a.status?.includes('跌破')?FALL_COLOR:RISE_COLOR}>{a.status}</span>, ''])}
        />
      </Section>

      {/* 7. 量能定性 */}
      <Section num={7} title="量能定性">
        <DataTable
          headers={['时段', '量能', '行为']}
          rows={(d.volumeProfile || []).map(v => [v.period, v.volume, v.behavior])}
        />
      </Section>

      {/* 8. 市场情绪 */}
      <Section num={8} title="市场情绪">
        <DataTable
          headers={['指标', '昨日', '今日', '方向']}
          rows={[
            ['涨停', d.sentiment?.limitUpPrev, <span className={RISE_COLOR}>{d.sentiment?.limitUp}</span>, ''],
            ['跌停', d.sentiment?.limitDownPrev, <span className={FALL_COLOR}>{d.sentiment?.limitDown}</span>, ''],
            ['上涨家数', d.sentiment?.upCountPrev, <span className={RISE_COLOR}>{d.sentiment?.upCount}</span>, ''],
            ['下跌家数', d.sentiment?.downCountPrev, <span className={FALL_COLOR}>{d.sentiment?.downCount}</span>, ''],
          ]}
        />
        <p className="text-sm text-gray-400 mt-2">{d.sentiment?.note}</p>
      </Section>

      {/* 9. 背离 */}
      <Section num={9} title="背离观测">
        <ul className="text-sm text-gray-300 space-y-1">
          {(d.divergence || []).map((dv, i) => (
            <li key={i}>• {dv.dim}：{dv.today}</li>
          ))}
        </ul>
      </Section>

      {/* 10. 竞价 */}
      <Section num={10} title="竞价复盘">
        <DataTable
          headers={['竞价信号', '表现', '含义']}
          rows={(d.auction || []).map(a => [a.signal, a.performance, a.meaning])}
        />
      </Section>

      {/* 11. 连板天花板 */}
      <Section num={11} title="连板天花板">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white/5 rounded-lg p-3"><span className="text-gray-500">高度</span> <span className="text-amber-400 ml-2 font-bold">{d.ceiling?.max}</span></div>
          <div className="bg-white/5 rounded-lg p-3"><span className="text-gray-500">最高标</span> <span className="text-gray-200 ml-2">{d.ceiling?.stock}</span></div>
        </div>
      </Section>

      {/* 12. 连板梯队 */}
      <Section num={12} title="连板梯队 & 关系网">
        <DataTable
          headers={['梯队', '标的', '方向', '角色', '关系']}
          rows={(d.ladder || []).map(l => [l.tier, l.stock, l.direction, l.role, l.relation])}
        />
      </Section>

      {/* 13. 盘中节点 */}
      <Section num={13} title="盘中关键节点">
        <DataTable
          headers={['时间', '事件', '信号']}
          rows={(d.keyMoments || []).map(k => [k.time, k.event, k.signal])}
        />
      </Section>

      {/* 14. 明线暗线 */}
      <Section num={14} title="明线 & 暗线">
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-1">明线</div>
          <p className="text-sm whitespace-pre-line text-gray-300">{d.visibleLines}</p>
        </div>
        <div className="border-t border-[#2a2d37] pt-3">
          <div className="text-xs text-gray-500 mb-1">暗线</div>
          <p className="text-sm whitespace-pre-line text-gray-300">{d.hiddenLines}</p>
        </div>
      </Section>

      {/* 15. 跷跷板 */}
      <Section num={15} title="科技内部跷跷板">
        <DataTable
          headers={['强', '弱', '轮动阶段']}
          rows={(d.seeSaw || []).map(s => [s.strong, s.weak, s.stage])}
        />
      </Section>

      {/* 16. 政策 */}
      <Section num={16} title="政策 vs 市场">
        <p className="text-sm text-gray-300">{d.visibleLines}</p>
      </Section>

      {/* 17. 池子（暂时隐藏）
      <Section num={17} title="博主池子追踪">
        <DataTable
          headers={['状态', '标的', '今日', '5日线']}
          rows={(d.poolStatus || []).map(p => [
            p.status,
            p.stock,
            <span className={String(p.today).startsWith('+') ? RISE_COLOR : FALL_COLOR}>{p.today}</span>,
            p.ma5
          ])}
        />
      </Section> */}

      {/* 调仓记录 */}
      {d.trades && d.trades.length > 0 && (
        <section className="bg-[#1a1d27] border border-purple-500/30 rounded-xl p-5 mb-4">
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">📝</span>
            <span className="text-purple-400">今日调仓</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium border-b border-[#2a2d37]">时间</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium border-b border-[#2a2d37]">操作</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium border-b border-[#2a2d37]">标的</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium border-b border-[#2a2d37]">价格</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium border-b border-[#2a2d37]">数量</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium border-b border-[#2a2d37]">盈亏</th>
                </tr>
              </thead>
              <tbody>
                {d.trades.map((t, i) => (
                  <tr key={i} className="border-b border-[#22252e]">
                    <td className="py-2 px-3 text-gray-300">{t.time}</td>
                    <td className={`py-2 px-3 font-semibold ${t.action === '买入' ? 'text-red-400' : 'text-green-500'}`}>{t.action}</td>
                    <td className="py-2 px-3 text-gray-300">{t.stock}</td>
                    <td className="py-2 px-3 text-gray-300">{t.price}</td>
                    <td className="py-2 px-3 text-gray-400">{t.shares}股</td>
                    <td className={`py-2 px-3 font-semibold ${String(t.pnl).startsWith('+') ? 'text-red-400' : 'text-green-500'}`}>{t.pnl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 18. 增量/腾挪 */}
      <Section num={18} title="增量资金 vs 场内腾挪">
        <p className="text-sm text-gray-300">{d.capitalFlow}</p>
      </Section>

      {/* 19. 风险 */}
      <Section num={19} title="风险点">
        <ul className="text-sm space-y-1">
          {(d.risks || []).map((r, i) => (
            <li key={i} className="text-green-500">• {r}</li>
          ))}
        </ul>
      </Section>

      {/* 20. 自问 */}
      <Section num={20} title="每日自问">
        <p className="text-sm text-gray-300 whitespace-pre-line">{d.selfQA}</p>
      </Section>

      {/* 21. 明日策略 */}
      <Section num={21} title="明日策略">
        <p className="text-sm text-gray-300 whitespace-pre-line">{d.strategy}</p>
      </Section>

      {/* 持仓 */}
      <HoldingsSection />

      {/* 新闻：A股精选 + 全球宏观 */}
      {(d.news?.length > 0 || d.globalNews?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {d.news?.length > 0 && (
            <section className="bg-[#1a1d27] border border-red-500/30 rounded-xl p-5">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">🇨🇳</span>
                <span className="text-red-400">A股精选</span>
              </h2>
              <div className="space-y-2">
                {d.news.slice(0, 6).map((n, i) => (
                  <div key={i} className="border-b border-[#2a2d37] pb-2 last:border-0">
                    <a href={n.link} target="_blank" className="text-gray-300 text-sm hover:text-red-400 transition">{n.title}</a>
                    <div className="text-gray-500 text-xs mt-0.5">{n.time}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {d.globalNews?.length > 0 && (
            <section className="bg-[#1a1d27] border border-blue-500/30 rounded-xl p-5">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">🌍</span>
                <span className="text-blue-400">全球宏观</span>
              </h2>
              <div className="space-y-2">
                {d.globalNews.slice(0, 6).map((n, i) => (
                  <div key={i} className="border-b border-[#2a2d37] pb-2 last:border-0">
                    <a href={n.link} target="_blank" className="text-gray-300 text-sm hover:text-blue-400 transition">{n.title}</a>
                    <div className="text-gray-500 text-xs mt-0.5">{n.time}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <details className="mb-4 opacity-50 hover:opacity-100 transition">
        <summary className="text-xs text-gray-600 cursor-pointer py-2">📡 数据来源</summary>
        <div className="text-xs text-gray-600 space-y-1 mt-2 pl-4 border-l border-gray-800">
          <p>腾讯 qt.gtimg.cn — 指数/纳指/个股行情</p>
          <p>AKShare — 涨跌停/涨跌家数/连板梯队/财经新闻</p>
          <p>东财 push2.eastmoney.com — 日经/韩国 (Mac本地)</p>
          <p>DeepSeek — AI定性分析</p>
          <p>同花顺 — 竞价数据 (手动)</p>
          <p>博主复盘帖 — 量化信号/深度分析 (手动)</p>
        </div>
      </details>

      {/* 交易绩效 */}
      <PerformanceSection />

      <footer className="text-center text-xs text-gray-600 py-8">
        daily-recap · deploy on Vercel
      </footer>
    </div>
  )
}
