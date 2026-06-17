import { useState, useEffect } from 'react'
import { Card, Button, Input, Modal, Table, Tag, TextArea } from '../components/UI.jsx'
import { membersApi } from '../services/api.js'

export default function MemberLevels() {
  const [levels, setLevels] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '', min_recharge: 0, discount_rate: 1, benefits: ''
  })

  const loadData = async () => {
    try {
      const res = await membersApi.levels()
      if (res.success) setLevels(res.data)
    } catch (e) { }
  }

  useEffect(() => { loadData() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', min_recharge: 0, discount_rate: 1, benefits: '' })
    setModalOpen(true)
  }

  const openEdit = (l) => {
    setEditing(l)
    setForm({ ...l })
    setModalOpen(true)
  }

  const submit = async () => {
    try {
      if (editing) await membersApi.updateLevel(editing.id, form)
      else await membersApi.createLevel(form)
      setModalOpen(false)
      loadData()
    } catch (e) { alert(e.message || '操作失败') }
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>会员等级体系</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, margin: 0 }}>总部统一设定会员等级、升级门槛和权益</p>
        </div>
        <Button onClick={openAdd}>+ 新增等级</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(levels.length, 4)}, 1fr)`, gap: 16 }}>
        {levels.map((lv, idx) => (
          <Card key={lv.id} style={{
            border: idx === levels.length - 1 ? '2px solid #8b5cf6' : '1px solid #e5e7eb',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {idx === levels.length - 1 && (
              <div style={{
                position: 'absolute', top: 0, right: 0,
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#fff', padding: '4px 14px', fontSize: 11, fontWeight: 600,
                borderBottomLeftRadius: 10
              }}>最高等级</div>
            )}
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: `linear-gradient(135deg, ${idx === 0 ? '#94a3b8' : idx === 1 ? '#60a5fa' : idx === 2 ? '#fbbf24' : '#a78bfa'}, ${idx === 0 ? '#64748b' : idx === 1 ? '#3b82f6' : idx === 2 ? '#f59e0b' : '#8b5cf6'})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px', fontSize: 26
              }}>
                {idx === 0 ? '🥉' : idx === 1 ? '🥈' : idx === 2 ? '🥇' : '💎'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{lv.name}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0891b2', margin: '8px 0' }}>
                {(Number(lv.discount_rate) * 100).toFixed(0)}<span style={{ fontSize: 14 }}>折</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>累计充值满 ¥{Number(lv.min_recharge).toLocaleString()} 升级</div>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>会员权益</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                {lv.benefits || '暂无权益描述'}
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Button size="sm" variant="secondary" onClick={() => openEdit(lv)}>编辑</Button>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0, marginBottom: 16 }}>等级明细</h3>
          <Table
            columns={[
              { key: 'name', title: '等级名称', render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
              { key: 'min_recharge', title: '升级门槛', render: (r) => <Tag color="blue">¥{Number(r.min_recharge).toLocaleString()}</Tag> },
              { key: 'discount_rate', title: '折扣率', render: (r) => <span style={{ color: '#0f766e', fontWeight: 600 }}>{(Number(r.discount_rate) * 100).toFixed(0)}折</span> },
              { key: 'benefits', title: '权益说明' }
            ]}
            data={levels}
            actions={[{ label: '编辑', onClick: openEdit }]}
          />
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? '编辑会员等级' : '新增会员等级'}>
        <Input label="等级名称" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="如：铂金会员" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="累计充值门槛(元)" type="number" value={form.min_recharge} onChange={(v) => setForm({ ...form, min_recharge: v })} />
          <Input label="折扣率(%)" type="number" value={form.discount_rate ? Number(form.discount_rate) * 100 : 100} onChange={(v) => setForm({ ...form, discount_rate: Number(v) / 100 })} />
        </div>
        <TextArea label="会员权益说明" value={form.benefits} onChange={(v) => setForm({ ...form, benefits: v })} rows={3} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
          <Button onClick={submit}>{editing ? '保存修改' : '确认添加'}</Button>
        </div>
      </Modal>
    </div>
  )
}
