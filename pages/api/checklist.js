export default function handler(req, res) {
  const { data } = req.body || {}
  const idx = data?.indices || {}
  const ext = data?.external || {}
  const sent = data?.sentiment || {}

  const checks = []

  // 1. 指数技术状态
  const shClose = idx.上证?.close
  if (shClose) {
    if (shClose < 4070) checks.push({ icon: '🔴', text: `上证${shClose}跌破4070支撑，注意4000保卫战`, tag: '技术面' })
    else if (shClose < 4140) checks.push({ icon: '🟡', text: `上证${shClose}在4070-4140震荡区间内`, tag: '技术面' })
    else checks.push({ icon: '🟢', text: `上证${shClose}站上4140，震荡区间上沿`, tag: '技术面' })
  }

  // 2. 科创50
  const kc = idx.科创50?.close
  if (kc) {
    if (kc < 2000) checks.push({ icon: '🔴', text: `科创50 ${kc} 跌破2000点，科技趋势危险`, tag: '科技阵眼' })
    else checks.push({ icon: '🟢', text: `科创50 ${kc} 站上2000点，科技趋势确认`, tag: '科技阵眼' })
  }

  // 3. 双创 vs 主板
  const cyChg = parseFloat(idx.创业板?.chg) || 0
  const shChg = parseFloat(idx.上证?.chg) || 0
  if (cyChg > 2 && shChg < 0.5) checks.push({ icon: '⚠️', text: `创业板${idx.创业板?.chg} vs 上证${idx.上证?.chg}，极度分化，注意跷跷板`, tag: '背离' })
  if (cyChg < -2 && shChg > -0.5) checks.push({ icon: '🔴', text: '双创暴跌但沪指抗跌→金融护盘，科技被抽血', tag: '背离' })

  // 4. 量能
  const vol = data?.totalVolume || ''
  if (vol.includes('3.2') || vol.includes('3.1')) checks.push({ icon: '🟡', text: `成交${vol}，缩量→存量博弈，不宜追高`, tag: '量能' })
  if (vol.includes('3.5') || vol.includes('3.6') || vol.includes('3.7')) checks.push({ icon: '🟢', text: `成交${vol}，放量→增量资金进场`, tag: '量能' })
  if (vol.includes('4')) checks.push({ icon: '🔴', text: `成交${vol}逼近4万亿→高潮预警，高潮次日不接力`, tag: '量能' })

  // 5. 外围
  const nas = ext?.nasdaq || ''
  if (nas.startsWith('-')) checks.push({ icon: '🔴', text: `纳指${nas}，外围偏弱→A股可能低开`, tag: '外围' })
  if (nas.startsWith('+') && parseFloat(nas) > 1) checks.push({ icon: '🟢', text: `纳指${nas}，外围偏强`, tag: '外围' })

  // 6. 涨跌停比
  const lu = sent?.limitUp || data?.limitUp || 0
  const ld = sent?.limitDown || data?.limitDown || 0
  if (lu > 0 && ld > 0) {
    if (lu > 100 && ld < 40) checks.push({ icon: '🟢', text: `涨停${lu}/跌停${ld}，百股涨停+低跌停=情绪健康`, tag: '情绪' })
    if (ld > 60) checks.push({ icon: '🔴', text: `涨停${lu}/跌停${ld}，跌停偏多→亏钱效应扩散`, tag: '情绪' })
    if (lu < 80 && ld > 40) checks.push({ icon: '🔴', text: `涨停${lu}/跌停${ld}，涨停少跌停多→短线退潮`, tag: '情绪' })
  }

  // 7. 普涨/普跌
  const up = sent?.upCount || data?.upCount || 0
  const dn = sent?.downCount || data?.downCount || 0
  if (up > 0 && dn > 0) {
    if (dn > 4000) checks.push({ icon: '🔴', text: `${dn}家下跌→普跌，系统性风险`, tag: '情绪' })
    if (up > 3500) checks.push({ icon: '🟢', text: `${up}家上涨→普涨，全面回暖`, tag: '情绪' })
    if (up < 2000 && dn < 3500) checks.push({ icon: '🟡', text: `涨${up}跌${dn}→结构性分化`, tag: '情绪' })
  }

  // 8. 博主固定提醒
  if (data?.weekday === '周一') checks.push({ icon: '💡', text: '周一：关注竞价抢修复还是分歧延续。抢修复=后手无买点。', tag: '节奏' })
  if (data?.weekday === '周二') checks.push({ icon: '💡', text: '周二：关注周一修复力度。连续修复两天后→收紧仓位。', tag: '节奏' })
  if (data?.weekday === '周五') checks.push({ icon: '💡', text: '周五：月底资金谨慎，控制仓位过周末。关注周末消息面。', tag: '节奏' })

  // 固定框架提醒
  checks.push({ icon: '📋', text: '易中天（中际/新易盛/天孚）走势是否止跌？→科技情绪阵眼', tag: '框架' })
  checks.push({ icon: '📋', text: '金融+科技是同步杀跌还是跷跷板？→同步杀跌=风险信号', tag: '框架' })
  checks.push({ icon: '📋', text: '连板高度几板？天花板是否被破？', tag: '框架' })
  checks.push({ icon: '📋', text: '池子里多少只站上5日线？→池子健康度', tag: '框架' })
  checks.push({ icon: '📋', text: '今日是高潮还是冰点？→高潮次日不接力，冰点次日找修复', tag: '框架' })

  res.status(200).json({ checks, generatedAt: new Date().toISOString() })
}
