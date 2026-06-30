// A股规则：红涨绿跌。🔴=利好/走强，🟢=利空/走弱
export default function handler(req, res) {
  const { data } = req.body || {}
  const idx = data?.indices || {}
  const ext = data?.external || {}
  const sent = data?.sentiment || {}
  const U = '🔴', D = '🟢', Y = '🟡', B = '💡', F = '📋'
  const checks = []

  const sh = idx.上证?.close
  if (sh) {
    if (sh < 4070) checks.push({ icon: D, text: `上证${sh}跌破4070支撑，注意4000保卫战`, tag: '技术面' })
    else if (sh < 4140) checks.push({ icon: Y, text: `上证${sh}在4070-4140震荡区间内`, tag: '技术面' })
    else checks.push({ icon: U, text: `上证${sh}站上4140，震荡区间突破`, tag: '技术面' })
  }

  const kc = idx.科创50?.close
  if (kc) {
    if (kc < 2000) checks.push({ icon: D, text: `科创50 ${kc} 跌破2000点，科技趋势危险`, tag: '科技阵眼' })
    else checks.push({ icon: U, text: `科创50 ${kc} 站上2000点，科技趋势确认`, tag: '科技阵眼' })
  }

  const cyChg = parseFloat(idx.创业板?.chg) || 0
  const shChg = parseFloat(idx.上证?.chg) || 0
  if (cyChg > 2 && shChg < 0.5) checks.push({ icon: Y, text: `创业板${idx.创业板?.chg} vs 上证${idx.上证?.chg}，极度分化`, tag: '背离' })
  if (cyChg < -2 && shChg > -0.5) checks.push({ icon: D, text: '双创暴跌但沪指抗跌→金融护盘', tag: '背离' })

  const vol = data?.totalVolume || ''
  if (vol.includes('3.2') || vol.includes('3.1')) checks.push({ icon: Y, text: `成交${vol}，缩量→存量博弈，不宜追高`, tag: '量能' })
  if (vol.includes('3.5') || vol.includes('3.6') || vol.includes('3.7')) checks.push({ icon: U, text: `成交${vol}，放量→增量资金进场`, tag: '量能' })
  if (vol.includes('4')) checks.push({ icon: D, text: `成交${vol}逼近4万亿→高潮预警`, tag: '量能' })

  const nas = ext?.nasdaq || ''
  if (nas.startsWith('-')) checks.push({ icon: D, text: `纳指${nas}，外围偏弱`, tag: '外围' })
  if (nas.startsWith('+') && parseFloat(nas) > 1) checks.push({ icon: U, text: `纳指${nas}，外围偏强`, tag: '外围' })

  const lu = sent?.limitUp || data?.limitUp || 0
  const ld = sent?.limitDown || data?.limitDown || 0
  if (lu > 0 && ld > 0) {
    if (lu > 100 && ld < 40) checks.push({ icon: U, text: `涨停${lu}/跌停${ld}，情绪健康`, tag: '情绪' })
    if (ld > 60) checks.push({ icon: D, text: `涨停${lu}/跌停${ld}，跌停偏多`, tag: '情绪' })
    if (lu < 80 && ld > 40) checks.push({ icon: D, text: `涨停${lu}/跌停${ld}，短线退潮`, tag: '情绪' })
  }

  const up = sent?.upCount || data?.upCount || 0
  const dn = sent?.downCount || data?.downCount || 0
  if (up > 0 && dn > 0) {
    if (dn > 4000) checks.push({ icon: D, text: `${dn}家下跌→普跌`, tag: '情绪' })
    if (up > 3500) checks.push({ icon: U, text: `${up}家上涨→普涨`, tag: '情绪' })
    if (up < 2000 && dn < 3500) checks.push({ icon: Y, text: `涨${up}跌${dn}→结构分化`, tag: '情绪' })
  }

  if (data?.weekday === '周一') checks.push({ icon: B, text: '周一：抢修复=后手无买点。分歧延续=机会。', tag: '节奏' })
  if (data?.weekday === '周二') checks.push({ icon: B, text: '周二：连涨两天后→收紧仓位。', tag: '节奏' })
  if (data?.weekday === '周五') checks.push({ icon: B, text: '周五：控制仓位过周末。', tag: '节奏' })

  checks.push({ icon: F, text: '易中天是否止跌？→科技情绪阵眼', tag: '框架' })
  checks.push({ icon: F, text: '金融+科技同步杀跌？→是=风险信号', tag: '框架' })
  checks.push({ icon: F, text: '量化平铺二板？→是=不追板，买点前置', tag: '框架' })
  checks.push({ icon: F, text: '连板高度？天花板是否被破？', tag: '框架' })
  checks.push({ icon: F, text: '今日高潮还是冰点？→高潮次日不接力', tag: '框架' })

  res.status(200).json({ checks, generatedAt: new Date().toISOString() })
}
