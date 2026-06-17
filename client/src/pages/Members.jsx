import { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Modal, Table, Tag } from '../components/UI.jsx'
import { membersApi, storesApi } from '../services/api.js'

export default function Members() {
  const [members, setMembers] = useState([])
  const [stores, setStores] = useState([])
  const [levels, setLevels] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [rechargeOpen, setRechargeOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filters, setFilters] = useState({ store_id: '', keyword: '', warning_type: '' })
  const [form, setForm] = useState({ card_no: '', name: '', phone: '', level_id: '', store_id: '', balance: 0 })
  const [rechargeForm, setRechargeForm] = useState({ amount: '', gift_amount: 0, payment_method: 'cash' })
  const [selectedIds, setSelectedIds] = useState([])
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchType, setBatchType] = useState('sms')
  const [smsTemplate, setSmsTemplate] = useState('【足浴品牌】尊敬的{name}会员，感谢您的支持，欢迎下次光临！')
  const [followNote, setFollowNote] = useState('')

  const loadData = async () => {
    try {
      const [mRes, sRes, lRes] = await Promise.all([
        membersApi.list(filters),
        storesApi.list(),
        membersApi.levels()
      ])
      if (mRes.success) setMembers(mRes.data)
      if (sRes.success) setStores(sRes.data)
      if (lRes.success) setLevels(lRes.data)
    } catch (e) { }
  }

  useEffect(() => { loadData() }, [filters])

  const openAdd = async () => {
    setEditing(null)
    let nextNo = ''
    try {
      const res = await membersApi.nextCardNo()
      if (res.success) nextNo = res.data.card_no
    } catch (e) {
      nextNo = 'M' + String(members.length + 1).padStart(5, '0')
    }
    setForm({ card_no: nextNo, name: '', phone: '', level_id: '', store_id: '', balance: 0 })
    setModalOpen(true)
  }

  const submit = async () => {
    try {
      await membersApi.create(form)
      setModalOpen(false)
      loadData()
    } catch (e) { alert(e.message || '操作失败') }
  }

  const openRecharge = (m) => {
    setEditing(m)
    setRechargeForm({ amount: '', gift_amount: 0, payment_method: 'cash' })
    setRechargeOpen(true)
  }

  const submitRecharge = async () => {
    if (!rechargeForm.amount) { alert('请输入充值金额'); return }
    try {
      await membersApi.recharge({
        member_id: editing.id,
        store_id: editing.store_id || stores[0]?.id,
        amount: Number(rechargeForm.amount),
        gift_amount: Number(rechargeForm.gift_amount) || 0,
        payment_method: rechargeForm.payment_method
      })
      setRechargeOpen(false)
      loadData()
      alert('充值成功')
    } catch (e) { alert(e.message || '充值失败') }
  }

  const getWarningTag = (m) => {
    const tags = []
    if (m.warning_type === 'low_balance' || m.balance < 50) {
      tags.push(<Tag key="lb" color="red" style={{ marginRight: 4 }}>余额不足</Tag>)
    }
    if (m.warning_type === 'inactive' || (m.days_since_last_order !== null && m.days_since_last_order >= 30)) {
      tags.push(<Tag key="ia" color="gray" style={{ marginRight: 4 }}>沉睡</Tag>)
    }
    if (m.warning_type === 'high_value' || m.total_consume >= 5000) {
      tags.push(<Tag key="hv" color="yellow" style={{ marginRight: 4 }}>🏆 高价值</Tag>)
    }
    return tags
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id)
      ? prev.filter(x => x !== id)
      : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === members.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(members.map(m => m.id))
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
      loadData()
    } catch (e) { alert(e.message || '操作失败') }
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>会员管理</h2>
        <Button onClick={openAdd}>+ 新增会员</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 180, marginBottom: 0 }}>
            <Select label="" value={filters.store_id} onChange={(v) => setFilters({ ...filters, store_id: v })}
              options={stores.map(s => ({ value: s.id, label: s.name }))}
              placeholder="所有门店"
              style={{ marginBottom: 0 }} />
          </div>
          <div style={{ minWidth: 180, marginBottom: 0 }}>
            <Select label="" value={filters.warning_type} onChange={(v) => setFilters({ ...filters, warning_type: v })}
              options={[
                { value: 'low_balance', label: '⚠️ 余额不足' },
                { value: 'inactive', label: '💤 沉睡会员' },
                { value: 'high_value', label: '🏆 高价值会员' }
              ]}
              placeholder="全部会员（无预警筛选）"
              style={{ marginBottom: 0 }} />
          </div>
          <div style={{ minWidth: 220 }}>
            <Input label="" value={filters.keyword} onChange={(v) => setFilters({ ...filters, keyword: v })}
              placeholder="搜索姓名/手机号/卡号" style={{ marginBottom: 0 }} />
          </div>
          <Button variant="secondary" onClick={() => { setFilters({ store_id: '', keyword: '', warning_type: '' }); setSelectedIds([]) }}>重置</Button>
        </div>
      </Card>

      {selectedIds.length > 0 && (
        <Card style={{ marginBottom: 16, padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#1e40af' }}>
              已选择 <span style={{ fontWeight: 700 }}>{selectedIds.length}</span> / {members.length} 位会员
            </span>
            <Button size="sm" onClick={() => openBatch('sms')}>📱 批量发送短信</Button>
            <Button size="sm" variant="success" onClick={() => openBatch('follow')}>✓ 批量标记已跟进</Button>
            <button
              onClick={() => setSelectedIds([])}
              style={{
                background: 'transparent', border: 'none', color: '#64748b',
                cursor: 'pointer', fontSize: 13
              }}
            >
              取消选择
            </button>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0', width: 44 }}>
                  <input
                    type="checkbox"
                    checked={members.length > 0 && selectedIds.length === members.length}
                    onChange={toggleSelectAll}
                    style={{ accentColor: '#0891b2' }}
                  />
                </th>
                {['会员卡号', '姓名', '手机号', '等级', '标签', '余额', '累计消费', '距上次消费', '办卡门店', '状态', '跟进状态', '操作'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr><td colSpan={12} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>暂无数据</td></tr>
              ) : members.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleSelect(m.id)} style={{ accentColor: '#0891b2' }} />
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#0891b2' }}>{m.card_no}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{m.name}</td>
                  <td style={{ padding: '10px 14px' }}>{m.phone}</td>
                  <td style={{ padding: '10px 14px' }}>{m.level_name ? <Tag color="purple">{m.level_name}</Tag> : '-'}</td>
                  <td style={{ padding: '10px 14px' }}>{getWarningTag(m)}</td>
                  <td style={{ padding: '10px 14px', color: m.balance < 50 ? '#dc2626' : '#0f766e', fontWeight: 600 }}>¥{Number(m.balance).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#334155' }}>¥{Number(m.total_consume).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: (m.days_since_last_order !== null && m.days_since_last_order >= 30) ? '#dc2626' : '#64748b' }}>
                    {m.days_since_last_order === null ? '从未消费' : `${m.days_since_last_order}天前`}
                  </td>
                  <td style={{ padding: '10px 14px' }}>{m.store_name || '-'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <Tag color={m.status === 'active' ? 'green' : 'red'}>
                      {m.status === 'active' ? '正常' : '已停用'}
                    </Tag>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {m.follow_up_status === 'followed'
                      ? <Tag color="green">✓ 已跟进</Tag>
                      : <Tag color="yellow">待跟进</Tag>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button
                      onClick={() => openRecharge(m)}
                      style={{
                        background: 'transparent', color: '#10b981',
                        border: 'none', cursor: 'pointer', fontWeight: 500,
                        padding: '4px 8px', borderRadius: 4, fontSize: 13
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#d1fae5'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      充值
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="新增会员">
        <Input label="会员卡号" value={form.card_no} onChange={(v) => setForm({ ...form, card_no: v })} />
        <Input label="会员姓名" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Input label="手机号" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Select label="会员等级" value={form.level_id} onChange={(v) => setForm({ ...form, level_id: v })}
          options={levels.map(l => ({ value: l.id, label: l.name }))} placeholder="请选择等级" />
        <Select label="办卡门店" value={form.store_id} onChange={(v) => setForm({ ...form, store_id: v })}
          options={stores.map(s => ({ value: s.id, label: s.name }))} placeholder="请选择门店" />
        <Input label="初始余额(元)" type="number" value={form.balance} onChange={(v) => setForm({ ...form, balance: v })} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
          <Button onClick={submit}>确认添加</Button>
        </div>
      </Modal>

      <Modal open={rechargeOpen} onClose={() => setRechargeOpen(false)} title={`会员充值 - ${editing?.name || ''}`}>
        {editing && (
          <>
            <div style={{ padding: 14, background: '#f0fdfa', borderRadius: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>当前余额</span>
                <span style={{ color: '#0f766e', fontWeight: 700, fontSize: 16 }}>¥{Number(editing.balance).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>累计充值</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>¥{Number(editing.total_recharge).toLocaleString()}</span>
              </div>
            </div>
            <Input label="充值金额(元)" type="number" value={rechargeForm.amount} onChange={(v) => setRechargeForm({ ...rechargeForm, amount: v })} placeholder="请输入充值金额" />
            <Input label="赠送金额(元)" type="number" value={rechargeForm.gift_amount} onChange={(v) => setRechargeForm({ ...rechargeForm, gift_amount: v })} />
            <Select label="支付方式" value={rechargeForm.payment_method} onChange={(v) => setRechargeForm({ ...rechargeForm, payment_method: v })} options={[
              { value: 'cash', label: '现金' },
              { value: 'card', label: '刷卡' }
            ]} />
            {rechargeForm.amount && (
              <div style={{ padding: 12, background: '#fefce8', borderRadius: 8, fontSize: 13 }}>
                充值后余额：<span style={{ fontWeight: 700, color: '#0f766e' }}>
                  ¥{(Number(editing.balance) + Number(rechargeForm.amount) + Number(rechargeForm.gift_amount || 0)).toFixed(2)}
                </span>
              </div>
            )}
          </>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="secondary" onClick={() => setRechargeOpen(false)}>取消</Button>
          <Button onClick={submitRecharge} variant="success">确认充值</Button>
        </div>
      </Modal>

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
