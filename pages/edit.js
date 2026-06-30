import { useState, useEffect } from 'react'
import Head from 'next/head'

const FIELDS = [
  { key: 'visibleLines', label: '明线', rows: 2, placeholder: '各方向强度排序...' },
  { key: 'hiddenLines', label: '暗线', rows: 3, placeholder: '中报主线轮动/逻辑闭环...' },
  { key: 'sentiment.note', label: '情绪定性', rows: 2, placeholder: '涨停XX跌停XX，连板晋级率XX%...' },
  { key: 'capitalFlow', label: '增量/腾挪判断', rows: 2, placeholder: '放量+普涨=增量，放量+科技涨+4000跌=腾挪...' },
  { key: 'cycle.nature', label: '周期定性', rows: 1, placeholder: '今日定性一句话...' },
  { key: 'cycle.stage', label: '周期阶段', rows: 1, placeholder: '良性震荡/主升/退潮...' },
  { key: 'selfQA', label: '每日自问', rows: 5, placeholder: '1. 模式内最好个股？\n2. 市场最好个股？\n3. 持仓偏见？' },
  { key: 'strategy', label: '明日策略', rows: 4, placeholder: '操作计划+节点推演...' },
]

function safeGet(obj, path) {
  return path.split('.').reduce((o, k) => (o || {})[k], obj)
}

function safeSet(obj, path, value) {
  const keys = path.split('.')
  const last = keys.pop()
  const target = keys.reduce((o, k) => { if (!o[k]) o[k] = {}; return o[k] }, obj)
  target[last] = value
  return obj
}

export default function Edit() {
  const [date, setDate] = useState('')
  const [data, setData] = useState(null)
  const [pass, setPass] = useState('')
  const [auth, setAuth] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checks, setChecks] = useState([])
  const [checkLoading, setCheckLoading] = useState(false)

  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get('date')
    if (d) setDate(d)
    else setDate(new Date().toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (!date) return
    fetch(`/api/recap?date=${date}`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) setData(d)
        else setData({})
      })
      .catch(() => setData({}))
  }, [date])

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, data, pass })
      })
      const result = await res.json()
      if (result.error) setMsg(`❌ ${result.error}`)
      else setMsg('✅ 已保存，30 秒后网站更新')
    } catch { setMsg('❌ 保存失败') }
    setSaving(false)
  }

  const [aiLoading, setAiLoading] = useState(false)

  const updateField = (key, value) => {
    if (!data) return
    setData({ ...safeSet({ ...data }, key, value) })
  }

  const [msg, setMsg] = useState('')

  // 生成检查清单
  const loadChecks = async () => {
    setCheckLoading(true)
    try {
      const res = await fetch('/api/checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      })
      const r = await res.json()
      setChecks(r.checks || [])
    } catch { }
    setCheckLoading(false)
  }

  useEffect(() => { if (data) loadChecks() }, [data])

  const handleAIDraft = async () => {
    setAiLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, data, pass })
      })
      const result = await res.json()
      if (result.error) { setMsg(`🤖 ${result.error}`); setAiLoading(false); return }
      // 把 AI 返回的字段填进去
      let updated = { ...data }
      Object.entries(result).forEach(([key, value]) => {
        updated = safeSet(updated, key, value)
      })
      setData(updated)
      setMsg('🤖 AI草稿已生成，请审核修改后点保存')
    } catch { setMsg('🤖 生成失败') }
    setAiLoading(false)
  }

  if (!auth) {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', textAlign: 'center', background: '#1a1d27', padding: 30, borderRadius: 12 }}>
        <Head><title>编辑模式</title></Head>
        <h2 style={{ color: '#f3f4f6', marginBottom: 16 }}>🔐 编辑模式</h2>
        <input
          type="password" placeholder="输入密码"
          value={pass} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setAuth(true)}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #374151', background: '#0f1117', color: '#d1d5db', fontSize: 16 }}
        />
        <button onClick={() => setAuth(true)} style={{ marginTop: 12, padding: '8px 24px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
          进入
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20, background: '#0f1117', minHeight: '100vh' }}>
      <Head><title>编辑 {date}</title></Head>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1 style={{ color: '#f3f4f6', fontSize: 18, margin: 0 }}>✏️ 编辑 {date}</h1>
        <a href={`/?date=${date}`} style={{ color: '#3b82f6', fontSize: 14 }}>预览 →</a>
        <div style={{ flex: 1 }} />
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '8px 20px', borderRadius: 8, background: saving ? '#374151' : '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          {saving ? '保存中...' : '💾 保存'}
        </button>
        <button onClick={handleAIDraft} disabled={aiLoading}
          style={{ padding: '8px 20px', borderRadius: 8, background: aiLoading ? '#374151' : '#8b5cf6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginLeft: 8 }}>
          {aiLoading ? '生成中...' : '🤖 AI草稿'}
        </button>
      </div>

      {msg && <div style={{ padding: 10, borderRadius: 8, background: msg.includes('✅') ? '#064e3b' : msg.includes('🤖') ? '#1e1b4b' : '#450a0a', color: msg.includes('✅') ? '#4ade80' : msg.includes('🤖') ? '#c4b5fd' : '#fca5a5', marginBottom: 16, fontSize: 14 }}>{msg}</div>}

      {checks.length > 0 && (
        <details style={{ marginBottom: 16, background: '#1a1d27', borderRadius: 10, border: '1px solid #2a2d37' }}>
          <summary style={{ padding: '10px 16px', cursor: 'pointer', color: '#f59e0b', fontSize: 14, fontWeight: 600 }}>📋 今日复盘检查清单（{checks.length}项）</summary>
          <div style={{ padding: '0 16px 12px' }}>
            {Object.entries(
              checks.reduce((acc, c) => { const t = c.tag || '其他'; if (!acc[t]) acc[t] = []; acc[t].push(c); return acc }, {})
            ).map(([tag, items]) => (
              <div key={tag} style={{ marginBottom: 8 }}>
                <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 3 }}>{tag}</div>
                {items.map((c, i) => (
                  <div key={i} style={{ color: '#d1d5db', fontSize: 13, padding: '2px 0' }}>{c.icon} {c.text}</div>
                ))}
              </div>
            ))}
          </div>
        </details>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['2026-06-22','2026-06-23','2026-06-24','2026-06-25','2026-06-26','2026-06-29','2026-06-30'].map(d => (
          <a key={d} href={`/edit?date=${d}`}
            style={{ padding: '4px 10px', borderRadius: 6, background: d === date ? '#3b82f6' : '#1a1d27', color: d === date ? '#fff' : '#9ca3af', fontSize: 12, textDecoration: 'none' }}>
            {d.slice(5)}
          </a>
        ))}
      </div>

      {data && FIELDS.map(f => (
        <div key={f.key} style={{ marginBottom: 16 }}>
          <label style={{ color: '#9ca3af', fontSize: 12, marginBottom: 4, display: 'block' }}>{f.label}</label>
          <textarea
            value={safeGet(data, f.key) || ''}
            onChange={e => updateField(f.key, e.target.value)}
            rows={f.rows}
            placeholder={f.placeholder}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #374151', background: '#1a1d27', color: '#d1d5db', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>
      ))}

      {!data && <p style={{ color: '#6b7280' }}>该日期暂无数据</p>}
    </div>
  )
} 
