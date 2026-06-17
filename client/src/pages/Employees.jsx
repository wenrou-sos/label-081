import { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Modal, Table, Tag, TextArea } from '../components/UI.jsx'
import { employeesApi, storesApi, servicesApi } from '../services/api.js'

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [stores, setStores] = useState([])
  const [services, setServices] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filters, setFilters] = useState({ store_id: '', status: '', position: '', keyword: '' })
  const [form, setForm] = useState({
    emp_no: '', name: '', phone: '', id_card: '', position: 'technician',
    store_id: '', skilled_services: '', training_records: '', hire_date: ''
  })
  const [transferForm, setTransferForm] = useState({ target_store_id: '', reason: '' })

  const loadData = async () => {
    try {
      const [eRes, sRes, svRes] = await Promise.all([
        employeesApi.list(filters),
        storesApi.list(),
        servicesApi.list()
      ])
      if (eRes.success) setEmployees(eRes.data)
      if (sRes.success) setStores(sRes.data)
      if (svRes.success) setServices(svRes.data)
    } catch (e) { }
  }

  useEffect(() => { loadData() }, [filters])

  const openAdd = () => {
    setEditing(null)
    const nextNo = 'T' + String(employees.length + 1).padStart(3, '0')
    setForm({ emp_no: nextNo, name: '', phone: '', id_card: '', position: 'technician', store_id: '', skilled_services: '', training_records: '', hire_date: new Date().toISOString().split('T')[0] })
    setModalOpen(true)
  }

  const openEdit = (e) => {
    setEditing(e)
    setForm({ ...e, skilled_services: e.skilled_services || '', training_records: e.training_records || '' })
    setModalOpen(true)
  }

  const submit = async () => {
    try {
      if (editing) await employeesApi.update(editing.id, form)
      else await employeesApi.create(form)
      setModalOpen(false)
      loadData()
    } catch (e) { alert(e.message || '操作失败') }
  }

  const handleResign = async (emp) => {
    if (!confirm(`确定要办理 ${emp.name} 的离职手续吗？`)) return
    try { await employeesApi.resign(emp.id); loadData() } catch (e) { }
  }

  const openTransfer = (emp) => {
    setEditing(emp)
    setTransferForm({ target_store_id: '', reason: '' })
    setTransferOpen(true)
  }

  const submitTransfer = async () => {
    if (!transferForm.target_store_id) { alert('请选择目标门店'); return }
    try {
      await employeesApi.transfer(editing.id, transferForm)
      setTransferOpen(false)
      loadData()
      alert('调动成功')
    } catch (e) { alert(e.message || '调动失败') }
  }

  const positionLabels = { technician: '技师', cashier: '收银员', manager: '店长', other: '其他' }
  const statusLabels = { active: '在职', resigned: '已离职', transferred: '已调动' }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>员工管理</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, margin: 0 }}>技师入职登记、培训记录、离职办理、跨店调动</p>
        </div>
        <Button onClick={openAdd}>+ 新增员工</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 150 }}>
            <Select label="" value={filters.store_id} onChange={(v) => setFilters({ ...filters, store_id: v })}
              options={stores.map(s => ({ value: s.id, label: s.name }))} placeholder="所有门店" style={{ marginBottom: 0 }} />
          </div>
          <div style={{ minWidth: 120 }}>
            <Select label="" value={filters.position} onChange={(v) => setFilters({ ...filters, position: v })} options={[
              { value: '', label: '所有岗位' },
              { value: 'technician', label: '技师' },
              { value: 'cashier', label: '收银员' },
              { value: 'manager', label: '店长' }
            ]} style={{ marginBottom: 0 }} />
          </div>
          <div style={{ minWidth: 120 }}>
            <Select label="" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={[
              { value: '', label: '所有状态' },
              { value: 'active', label: '在职' },
              { value: 'resigned', label: '已离职' }
            ]} style={{ marginBottom: 0 }} />
          </div>
          <div style={{ minWidth: 200 }}>
            <Input label="" value={filters.keyword} onChange={(v) => setFilters({ ...filters, keyword: v })}
              placeholder="搜索姓名/工号" style={{ marginBottom: 0 }} />
          </div>
          <Button variant="secondary" onClick={() => setFilters({ store_id: '', status: '', position: '', keyword: '' })}>重置</Button>
        </div>
      </Card>

      <Card>
        <Table
          columns={[
            { key: 'emp_no', title: '工号', render: (r) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0891b2' }}>{r.emp_no}</span> },
            { key: 'name', title: '姓名', render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
            { key: 'phone', title: '联系电话' },
            { key: 'position', title: '岗位', render: (r) => <Tag color="purple">{positionLabels[r.position]}</Tag> },
            { key: 'store_name', title: '所属门店' },
            { key: 'skilled_services', title: '擅长项目', render: (r) => {
              if (!r.skilled_services) return '-'
              const ids = String(r.skilled_services).split(',')
              return ids.map(id => services.find(s => s.id == id)?.name).filter(Boolean).join('、') || '-'
            }},
            { key: 'hire_date', title: '入职日期' },
            { key: 'status', title: '状态', render: (r) => <Tag color={r.status === 'active' ? 'green' : r.status === 'resigned' ? 'red' : 'yellow'}>{statusLabels[r.status]}</Tag> }
          ]}
          data={employees}
          actions={[
            { label: '编辑', onClick: openEdit },
            { label: '调动', onClick: openTransfer, color: '#8b5cf6', show: (r) => r.status === 'active' },
            { label: '离职', onClick: handleResign, color: '#ef4444', show: (r) => r.status === 'active' }
          ]}
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? '编辑员工' : '新增员工（入职登记）'} width={600}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="工号" value={form.emp_no} onChange={(v) => setForm({ ...form, emp_no: v })} />
          <Input label="姓名" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="联系电话" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="身份证号" value={form.id_card} onChange={(v) => setForm({ ...form, id_card: v })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="岗位" value={form.position} onChange={(v) => setForm({ ...form, position: v })} options={[
            { value: 'technician', label: '技师' },
            { value: 'cashier', label: '收银员' },
            { value: 'manager', label: '店长' },
            { value: 'other', label: '其他' }
          ]} />
          <Select label="所属门店" value={form.store_id} onChange={(v) => setForm({ ...form, store_id: v })}
            options={stores.map(s => ({ value: s.id, label: s.name }))} placeholder="请选择门店" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: 500 }}>擅长项目（可多选）</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {services.filter(s => s.status === 'active').map(s => {
              const selected = String(form.skilled_services || '').split(',').filter(Boolean).includes(String(s.id))
              return (
                <label key={s.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                  background: selected ? '#e0f2fe' : '#f8fafc',
                  border: `1px solid ${selected ? '#0891b2' : '#e2e8f0'}`,
                  fontSize: 13, color: selected ? '#0e7490' : '#475569',
                  fontWeight: selected ? 600 : 400,
                  transition: 'all 0.15s'
                }}>
                  <input type="checkbox" checked={selected} onChange={() => {
                    const current = String(form.skilled_services || '').split(',').filter(Boolean)
                    const next = selected
                      ? current.filter(id => id !== String(s.id))
                      : [...current, String(s.id)]
                    setForm({ ...form, skilled_services: next.join(',') })
                  }} style={{ accentColor: '#0891b2' }} />
                  {s.name} <span style={{ fontSize: 11, color: '#94a3b8' }}>¥{s.price}</span>
                </label>
              )
            })}
          </div>
        </div>
        <Input label="入职日期" type="date" value={form.hire_date} onChange={(v) => setForm({ ...form, hire_date: v })} />
        <TextArea label="培训考核记录（JSON格式或备注）" value={form.training_records} onChange={(v) => setForm({ ...form, training_records: v })} rows={3} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
          <Button onClick={submit}>{editing ? '保存修改' : '确认入职登记'}</Button>
        </div>
      </Modal>

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="员工调动" width={440}>
        {editing && (
          <>
            <div style={{ padding: 14, background: '#f5f3ff', borderRadius: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>调动员工</div>
              <div style={{ fontWeight: 700, color: '#7c3aed' }}>{editing.emp_no} · {editing.name}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>当前门店：{editing.store_name}</div>
            </div>
            <Select label="目标门店" value={transferForm.target_store_id} onChange={(v) => setTransferForm({ ...transferForm, target_store_id: v })}
              options={stores.filter(s => s.id != editing.store_id).map(s => ({ value: s.id, label: s.name }))}
              placeholder="请选择目标门店" />
            <TextArea label="调动原因" value={transferForm.reason} onChange={(v) => setTransferForm({ ...transferForm, reason: v })} rows={2} />
          </>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="secondary" onClick={() => setTransferOpen(false)}>取消</Button>
          <Button onClick={submitTransfer} variant="success">确认调动</Button>
        </div>
      </Modal>
    </div>
  )
}
