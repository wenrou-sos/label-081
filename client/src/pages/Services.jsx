import { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Modal, Table, Tag, TextArea } from '../components/UI.jsx'
import { servicesApi } from '../services/api.js'

export default function Services() {
  const [services, setServices] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '', description: '', duration: 60, price: '', category: '足疗',
    status: 'active', base_commission: 0, commission_rate: 0
  })

  const loadData = async () => {
    try {
      const res = await servicesApi.list()
      if (res.success) setServices(res.data)
    } catch (e) { }
  }

  useEffect(() => { loadData() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', description: '', duration: 60, price: '', category: '足疗', status: 'active', base_commission: 0, commission_rate: 0 })
    setModalOpen(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({ ...s })
    setModalOpen(true)
  }

  const submit = async () => {
    try {
      if (editing) await servicesApi.update(editing.id, form)
      else await servicesApi.create(form)
      setModalOpen(false)
      loadData()
    } catch (e) { alert(e.message || '操作失败') }
  }

  const toggleStatus = async (s) => {
    if (!confirm(`确定要${s.status === 'active' ? '下架' : '上架'}该项目吗？`)) return
    try {
      await servicesApi.update(s.id, { ...s, status: s.status === 'active' ? 'inactive' : 'active' })
      loadData()
    } catch (e) { }
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>项目定价管理</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, margin: 0 }}>总部统一管理各门店服务项目的定价和技师提成标准</p>
        </div>
        <Button onClick={openAdd}>+ 新增项目</Button>
      </div>

      <Card>
        <Table
          columns={[
            { key: 'name', title: '项目名称', render: (r) => <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.name}</span> },
            { key: 'category', title: '分类', render: (r) => <Tag color="purple">{r.category}</Tag> },
            { key: 'duration', title: '时长', render: (r) => `${r.duration}分钟` },
            { key: 'price', title: '定价', render: (r) => <span style={{ color: '#0f766e', fontWeight: 600, fontSize: 15 }}>¥{Number(r.price).toFixed(2)}</span> },
            { key: 'base_commission', title: '基础提成', render: (r) => `¥${Number(r.base_commission || 0).toFixed(2)}` },
            { key: 'commission_rate', title: '提成比例', render: (r) => `${(Number(r.commission_rate || 0) * 100).toFixed(0)}%` },
            { key: 'status', title: '状态', render: (r) => <Tag color={r.status === 'active' ? 'green' : 'gray'}>{r.status === 'active' ? '在售' : '已下架'}</Tag> }
          ]}
          data={services}
          actions={[
            { label: '编辑', onClick: openEdit },
            { label: (row) => row.status === 'active' ? '下架' : '上架', onClick: toggleStatus, color: '#ef4444' }
          ]}
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? '编辑项目' : '新增项目'} width={560}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="项目名称" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Select label="项目分类" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={[
            { value: '足疗', label: '足疗' },
            { value: 'SPA', label: 'SPA' },
            { value: '理疗', label: '理疗' },
            { value: '养生', label: '养生' },
            { value: '其他', label: '其他' }
          ]} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="服务时长(分钟)" type="number" value={form.duration} onChange={(v) => setForm({ ...form, duration: v })} />
          <Input label="定价(元)" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
        </div>
        <TextArea label="项目描述" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        <div style={{ padding: '14px', background: '#f0fdfa', borderRadius: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f766e', marginBottom: 10 }}>💰 技师提成设置</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="基础提成(元/单)" type="number" value={form.base_commission} onChange={(v) => setForm({ ...form, base_commission: v })} />
            <Input label="业绩提成比例(%)" type="number" value={form.commission_rate ? Number(form.commission_rate) * 100 : 0} onChange={(v) => setForm({ ...form, commission_rate: Number(v) / 100 })} />
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
            单提成 = 基础提成 + 订单金额 × 提成比例
          </div>
        </div>
        <Select label="状态" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={[
          { value: 'active', label: '在售' },
          { value: 'inactive', label: '已下架' }
        ]} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
          <Button onClick={submit}>{editing ? '保存修改' : '确认添加'}</Button>
        </div>
      </Modal>
    </div>
  )
}
