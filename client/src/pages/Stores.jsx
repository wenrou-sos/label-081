import { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Modal, Table, Tag } from '../components/UI.jsx'
import { storesApi } from '../services/api.js'

export default function Stores() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '', address: '', phone: '', manager: '', status: 'active'
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await storesApi.list()
      if (res.success) setStores(res.data)
    } catch (e) { }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', address: '', phone: '', manager: '', status: 'active' })
    setModalOpen(true)
  }

  const openEdit = (store) => {
    setEditing(store)
    setForm({ ...store })
    setModalOpen(true)
  }

  const submit = async () => {
    try {
      if (editing) await storesApi.update(editing.id, form)
      else await storesApi.create(form)
      setModalOpen(false)
      loadData()
    } catch (e) { alert(e.message || '操作失败') }
  }

  const toggleStatus = async (store) => {
    if (!confirm(`确定要${store.status === 'active' ? '禁用' : '启用'}该门店吗？`)) return
    try {
      await storesApi.update(store.id, { ...store, status: store.status === 'active' ? 'inactive' : 'active' })
      loadData()
    } catch (e) { }
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>门店管理</h2>
        <Button onClick={openAdd}>+ 新增门店</Button>
      </div>

      <Card>
        <Table
          columns={[
            { key: 'name', title: '门店名称', render: (r) => <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.name}</span> },
            { key: 'address', title: '地址' },
            { key: 'phone', title: '联系电话' },
            { key: 'manager', title: '负责人' },
            { key: 'status', title: '状态', render: (r) => <Tag color={r.status === 'active' ? 'green' : 'gray'}>{r.status === 'active' ? '正常营业' : '已停用'}</Tag> },
          ]}
          data={stores}
          actions={[
            { label: '编辑', onClick: openEdit },
            { label: (row) => row.status === 'active' ? '禁用' : '启用', onClick: toggleStatus, color: '#ef4444' }
          ]}
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? '编辑门店' : '新增门店'}>
        <Input label="门店名称" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="请输入门店名称" />
        <Input label="门店地址" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="请输入详细地址" />
        <Input label="联系电话" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="请输入联系电话" />
        <Input label="门店负责人" value={form.manager} onChange={(v) => setForm({ ...form, manager: v })} placeholder="请输入负责人姓名" />
        <Select label="状态" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={[
          { value: 'active', label: '正常营业' },
          { value: 'inactive', label: '已停用' }
        ]} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
          <Button onClick={submit}>{editing ? '保存修改' : '确认添加'}</Button>
        </div>
      </Modal>
    </div>
  )
}
