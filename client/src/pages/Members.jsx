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
  const [filters, setFilters] = useState({ store_id: '', keyword: '' })
  const [form, setForm] = useState({ card_no: '', name: '', phone: '', level_id: '', store_id: '', balance: 0 })
  const [rechargeForm, setRechargeForm] = useState({ amount: '', gift_amount: 0, payment_method: 'cash' })

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

  const openAdd = () => {
    setEditing(null)
    const nextNo = 'M' + String(members.length + 1).padStart(5, '0')
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
          <div style={{ minWidth: 220 }}>
            <Input label="" value={filters.keyword} onChange={(v) => setFilters({ ...filters, keyword: v })}
              placeholder="搜索姓名/手机号/卡号" style={{ marginBottom: 0 }} />
          </div>
          <Button variant="secondary" onClick={() => setFilters({ store_id: '', keyword: '' })}>重置</Button>
        </div>
      </Card>

      <Card>
        <Table
          columns={[
            { key: 'card_no', title: '会员卡号', render: (r) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0891b2' }}>{r.card_no}</span> },
            { key: 'name', title: '姓名' },
            { key: 'phone', title: '手机号' },
            { key: 'level_name', title: '等级', render: (r) => r.level_name ? <Tag color="purple">{r.level_name}</Tag> : '-' },
            { key: 'store_name', title: '办卡门店' },
            { key: 'balance', title: '余额', render: (r) => <span style={{ color: '#0f766e', fontWeight: 600 }}>¥{Number(r.balance).toFixed(2)}</span> },
            { key: 'total_recharge', title: '累计充值', render: (r) => `¥${Number(r.total_recharge).toLocaleString()}` },
            { key: 'status', title: '状态', render: (r) => <Tag color={r.status === 'active' ? 'green' : 'red'}>{r.status === 'active' ? '正常' : '已停用'}</Tag> }
          ]}
          data={members}
          actions={[{ label: '充值', onClick: openRecharge, color: '#10b981' }]}
        />
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
    </div>
  )
}
