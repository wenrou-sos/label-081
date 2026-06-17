import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Select, Table, Tag } from '../components/UI.jsx'
import { shiftReportsApi, storesApi } from '../services/api.js'

export default function ShiftReports() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [stores, setStores] = useState([])
  const [filters, setFilters] = useState({ store_id: '', start_date: '', end_date: '' })
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ store_id: '', shift_id: '', report_date: new Date().toISOString().split('T')[0] })
  const [shifts, setShifts] = useState([])

  const loadData = async () => {
    try {
      const [rRes, sRes] = await Promise.all([
        shiftReportsApi.list(filters),
        storesApi.list()
      ])
      if (rRes.success) setReports(rRes.data)
      if (sRes.success) setStores(sRes.data)
    } catch (e) { }
  }

  useEffect(() => { loadData() }, [filters])

  const loadShifts = async (storeId) => {
    if (!storeId) return
    try {
      const res = await shiftReportsApi.shifts(storeId)
      if (res.success) setShifts(res.data)
    } catch (e) { }
  }

  const handleStoreChange = (v) => {
    setCreateForm({ ...createForm, store_id: v, shift_id: '' })
    loadShifts(v)
  }

  const generateReport = async () => {
    if (!createForm.store_id || !createForm.shift_id) {
      alert('请选择门店和班次'); return
    }
    try {
      const res = await shiftReportsApi.generate(createForm.store_id, createForm.report_date, createForm.shift_id)
      if (res.success) {
        const saveRes = await shiftReportsApi.create({
          ...res.data,
          service_details: JSON.stringify(res.data.service_details),
          technician_details: JSON.stringify(res.data.technician_details)
        })
        if (saveRes.success) {
          setCreateOpen(false)
          navigate(`/shift-reports/${saveRes.data.id}`)
        }
      }
    } catch (e) { alert(e.message || '生成失败') }
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>交接班报表</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, margin: 0 }}>门店每日交接班，营收汇总、双方签字确认</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>📝 生成交班报表</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 150 }}>
            <Select label="" value={filters.store_id} onChange={(v) => setFilters({ ...filters, store_id: v })}
              options={stores.map(s => ({ value: s.id, label: s.name }))} placeholder="所有门店" style={{ marginBottom: 0 }} />
          </div>
          <div style={{ minWidth: 140 }}>
            <Input label="" type="date" value={filters.start_date} onChange={(v) => setFilters({ ...filters, start_date: v })} style={{ marginBottom: 0 }} />
          </div>
          <div style={{ minWidth: 140 }}>
            <Input label="" type="date" value={filters.end_date} onChange={(v) => setFilters({ ...filters, end_date: v })} style={{ marginBottom: 0 }} />
          </div>
          <Button variant="secondary" onClick={() => setFilters({ store_id: '', start_date: '', end_date: '' })}>重置</Button>
        </div>
      </Card>

      <Card>
        <Table
          columns={[
            { key: 'id', title: '报表ID', render: (r) => <span style={{ fontFamily: 'monospace', color: '#0891b2' }}>#{r.id}</span> },
            { key: 'store_name', title: '门店' },
            { key: 'shift_name', title: '班次' },
            { key: 'report_date', title: '交班日期' },
            { key: 'customer_count', title: '接待人数', render: (r) => <span style={{ fontWeight: 600 }}>{r.customer_count} 人</span> },
            { key: 'total_amount', title: '营收总额', render: (r) => <span style={{ color: '#0f766e', fontWeight: 700, fontSize: 15 }}>¥{Number(r.total_amount).toLocaleString()}</span> },
            { key: 'cash_amount', title: '现金', render: (r) => `¥${Number(r.cash_amount).toFixed(0)}` },
            { key: 'card_amount', title: '刷卡', render: (r) => `¥${Number(r.card_amount).toFixed(0)}` },
            { key: 'member_amount', title: '会员卡', render: (r) => `¥${Number(r.member_amount).toFixed(0)}` },
            { key: 'status', title: '状态', render: (r) => r.status === 'confirmed'
              ? <Tag color="green">✓ 已确认</Tag>
              : <Tag color="yellow">待签字</Tag> }
          ]}
          data={reports}
          actions={[{ label: '查看详情', onClick: (r) => navigate(`/shift-reports/${r.id}`), color: '#0891b2' }]}
        />
      </Card>

      <Card style={{ marginTop: 16, display: createOpen ? 'block' : 'none' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0, marginBottom: 16 }}>生成交班报表</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <Select label="选择门店" value={createForm.store_id} onChange={handleStoreChange}
            options={stores.map(s => ({ value: s.id, label: s.name }))} placeholder="请选择门店" />
          <Select label="选择班次" value={createForm.shift_id} onChange={(v) => setCreateForm({ ...createForm, shift_id: v })}
            options={shifts.map(s => ({ value: s.id, label: `${s.shift_name} (${s.start_time}-${s.end_time})` }))}
            placeholder="请先选择门店" />
          <Input label="交班日期" type="date" value={createForm.report_date} onChange={(v) => setCreateForm({ ...createForm, report_date: v })} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>取消</Button>
          <Button onClick={generateReport}>生成报表</Button>
        </div>
      </Card>
    </div>
  )
}
