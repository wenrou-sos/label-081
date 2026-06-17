import { useState, useEffect } from 'react'
import { Card, StatCard, Tag, Button, Select, Modal } from '../components/UI.jsx'
import { membersApi, storesApi } from '../services/api.js'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

const COLORS = ['#94a3b8', '#60a5fa', '#fbbf24', '#a78bfa']

export default function MemberAnalysis() {
  const [summary, setSummary] = useState(null)
  const [levelDist, setLevelDist] = useState([])
  const [trend, setTrend] = useState([])
  const [members, setMembers] = useState([])
  const [stores, setStores] = useState([])
  const [selectedMember, setSelectedMember] = useState('')
  const [warnings, setWarnings] = useState({ low_balance: [], inactive: [], high_value: [] })
  const [activeTab, setActiveTab] = useState('low_balance')
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchType, setBatchType] = useState('sms')
  const [selectedIds, setSelectedIds] = useState([])
  const [smsTemplate, setSmsTemplate] = useState('【足浴品牌】尊敬的{name}会员，您的会员卡余额已不足，欢迎续充享受更多优惠！')
  const [followNote, setFollowNote] = useState('')

  const loadData = async () => {
    try {
      const [sumRes, distRes, trendRes, memRes, storeRes] = await Promise.all([
        membersApi.analysisSummary(),
        membersApi.analysisLevelDistribution(),
        membersApi.analysisTrend({ months: 6 }),
        membersApi.list(),
        storesApi.list()
      ])
      if (sumRes.success) setSummary(sumRes.data)
      if (distRes.success) setLevelDist(distRes.data)
      if (trendRes.success) setTrend(trendRes.data)
      if (memRes.success) setMembers(memRes.data)
      if (storeRes.success) setStores(storeRes.data)
    } catch (e) { console.error(e) }
  }

  const loadWarnings = async () => {
    try {
      const [low, inactive, high] = await Promise.all([
        membersApi.analysisWarnings({ type: 'low_balance' }),
        membersApi.analysisWarnings({ type: 'inactive' }),
        membersApi.analysisWarnings({ type: 'high_value' })
      ])
      if (low.success) setWarnings(prev => ({ ...prev, low_balance: low.data }))
      if (inactive.success) setWarnings(prev => ({ ...prev, inactive: inactive.data }))
      if (high.success) setWarnings(prev => ({ ...prev, high_value: high.data }))
    } catch (e) { }
  }

  const loadMemberTrend = async (memberId) => {
    if (!memberId) {
      const res = await membersApi.analysisTrend({ months: 6 })
      if (res.success) setTrend(res.data)
      return
    }
    const res = await membersApi.analysisTrend({ member_id: memberId, months: 6 })
    if (res.success) setTrend(res.data)
  }

  useEffect(() => {
    loadData()
    loadWarnings()
  }, [])

  useEffect(() => {
    loadMemberTrend(selectedMember)
  }, [selectedMember])

  const pieData = levelDist.map(l => ({
    name: l.name,
    value: l.member_count || 0
  }))

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id)
      ? prev.filter(x => x !== id)
      : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    const currentList = warnings[activeTab] || []
    if (selectedIds.length === currentList.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(currentList.map(m => m.id))
    }
  }

  const openBatch = (type) => {
    if (selectedIds.length === 0) {
      alert('请先选择要操作的会员')
      return
    }
    setBatchType(type)
    setBatchModalOpen(true)
  }

  const executeBatch = async () => {
    try {
      if (batchType === 'sms') {
        await membersApi.batchSendSms({ ids: selectedIds, template: smsTemplate })
        alert(`已成功发送 ${selectedIds.length} 条短信`)
      } else {
        await membersApi.batchFollowUp({ ids: selectedIds, note: followNote })
        alert(`已批量标记 ${selectedIds.length} 位会员为已跟进`)
      }
      setBatchModalOpen(false)
      setSelectedIds([])
      loadWarnings()
    } catch (e) { alert(e.message || '操作失败') }
  }

  const warningLabels = {
    low_balance: { label: '余额不足', icon: '⚠️', color: 'red', desc: '余额低于50元，需要跟进充值' },
    inactive: { label: '沉睡会员', icon: '💤', color: 'gray', desc: '超过30天没来消费' },
    high_value: { label: '高价值会员', icon: '🏆', color: 'yellow', desc: '累计消费超过5000元' }
  }

  const currentList = warnings[activeTab] || []

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>会员消费分析</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, margin: 0 }}>会员结构分析、消费趋势、智能预警跟进</p>
        </div>
        <Button onClick={() => { loadData(); loadWarnings() }}>🔄 刷新数据</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard title="会员总数" value={summary?.total_members || 0} icon="👥" color="blue" />
        <StatCard title="活跃会员占比" value={`${summary?.active_rate || 0}%`} icon="🔥" color="green" />
        <StatCard title="沉睡会员" value={summary?.inactive_members || 0} icon="💤" color="purple" />
        <StatCard title="本月新增" value={summary?.new_this_month || 0} icon="🆕" color="orange" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard title="余额不足" value={summary?.low_balance || 0} icon="⚠️" color="red" />
        <StatCard title="高价值会员" value={summary?.high_value || 0} icon="🏆" color="yellow" />
        <StatCard title="会员总余额" value={`¥${Number(summary?.total_balance || 0).toLocaleString()}`} icon="💰" color="blue" />
        <StatCard title="累计消费总额" value={`¥${Number(summary?.total_consume || 0).toLocaleString()}`} icon="📊" color="green" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0, marginBottom: 16 }}>会员等级分布</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            {levelDist.map((l, i) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: COLORS[i % COLORS.length] }}></span>
                <span style={{ color: '#64748b' }}>{l.name}: {l.member_count}人 ({(l.discount_rate * 100).toFixed(0)}折)</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0 }}>消费金额趋势（近6个月）</h3>
            <Select
              value={selectedMember}
              onChange={setSelectedMember}
              options={members.map(m => ({ value: m.id, label: `${m.name}(${m.card_no})` }))}
              placeholder="全品牌合计"
              style={{ width: 180, marginBottom: 0 }}
            />
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip formatter={(value, name) => name === 'amount' ? [`¥${Number(value).toLocaleString()}`, '消费金额'] : [`${value}次`, '消费频次']} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="amount" stroke="#0891b2" strokeWidth={3} dot={{ fill: '#0891b2', r: 4 }} name="消费金额(元)" />
                <Line yAxisId="right" type="monotone" dataKey="order_count" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} name="消费频次(次)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {Object.entries(warningLabels).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setSelectedIds([]) }}
                style={{
                  padding: '8px 18px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === key ? 'linear-gradient(135deg, #0891b2, #0e7490)' : '#f1f5f9',
                  color: activeTab === key ? '#fff' : '#475569',
                  fontWeight: 500,
                  fontSize: 13
                }}
              >
                {cfg.icon} {cfg.label} ({warnings[key]?.length || 0})
              </button>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{warningLabels[activeTab].desc}</div>
        </div>

        {currentList.length > 0 && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#f0f9ff', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedIds.length === currentList.length && currentList.length > 0}
                onChange={toggleSelectAll}
                style={{ accentColor: '#0891b2' }}
              />
              全选 ({selectedIds.length}/{currentList.length})
            </label>
            <Button size="sm" onClick={() => openBatch('sms')} disabled={selectedIds.length === 0}>📱 批量发送短信</Button>
            <Button size="sm" variant="success" onClick={() => openBatch('follow')} disabled={selectedIds.length === 0}>✓ 批量标记已跟进</Button>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0', width: 40 }}></th>
                {['会员卡号', '姓名', '手机号', '等级', '余额', '累计消费', '距上次消费', '门店', '跟进状态'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentList.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>暂无数据</td></tr>
              ) : currentList.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleSelect(m.id)} style={{ accentColor: '#0891b2' }} />
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#0891b2', fontWeight: 600 }}>{m.card_no}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                    {m.name}
                    {m.warning_type === 'low_balance' && <Tag color="red" style={{ marginLeft: 6 }}>余额不足</Tag>}
                    {m.warning_type === 'inactive' && <Tag color="gray" style={{ marginLeft: 6 }}>沉睡</Tag>}
                    {m.warning_type === 'high_value' && <Tag color="yellow" style={{ marginLeft: 6 }}>🏆 高价值</Tag>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>{m.phone}</td>
                  <td style={{ padding: '10px 14px' }}>{m.level_name ? <Tag color="purple">{m.level_name}</Tag> : '-'}</td>
                  <td style={{ padding: '10px 14px', color: m.balance < 50 ? '#dc2626' : '#0f766e', fontWeight: 600 }}>¥{Number(m.balance).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>¥{Number(m.total_consume).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {m.days_since_last_order === null ? '从未消费' : `${m.days_since_last_order}天前`}
                  </td>
                  <td style={{ padding: '10px 14px' }}>{m.store_name || '-'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {m.follow_up_status === 'followed'
                      ? <Tag color="green">✓ 已跟进</Tag>
                      : <Tag color="yellow">待跟进</Tag>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={batchModalOpen} onClose={() => setBatchModalOpen(false)} title={batchType === 'sms' ? '批量发送短信' : '批量标记已跟进'} width={520}>
        <div style={{ padding: 14, background: '#eff6ff', borderRadius: 10, marginBottom: 16 }}>
          已选择 <span style={{ fontWeight: 700, color: '#1e40af' }}>{selectedIds.length}</span> 位会员
        </div>
        {batchType === 'sms' ? (
          <>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>短信模板（支持 {`{name}`} 变量替换）</div>
            <textarea
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              rows={4}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid #e2e8f0', fontSize: 13,
                fontFamily: 'inherit', resize: 'vertical'
              }}
            />
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
              预览：{smsTemplate.replace('{name}', '张三')}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>跟进备注（可选）</div>
            <textarea
              value={followNote}
              onChange={(e) => setFollowNote(e.target.value)}
              rows={3}
              placeholder="请输入跟进备注..."
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid #e2e8f0', fontSize: 13,
                fontFamily: 'inherit', resize: 'vertical'
              }}
            />
          </>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="secondary" onClick={() => setBatchModalOpen(false)}>取消</Button>
          <Button onClick={executeBatch}>确认执行</Button>
        </div>
      </Modal>
    </div>
  )
}
