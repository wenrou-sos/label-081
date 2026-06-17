import { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Table, Tag } from '../components/UI.jsx'
import { ordersApi, storesApi } from '../services/api.js'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [stores, setStores] = useState([])
  const [filters, setFilters] = useState({ store_id: '', payment_method: '', start_date: '', end_date: '' })

  const loadData = async () => {
    try {
      const [oRes, sRes] = await Promise.all([
        ordersApi.list(filters),
        storesApi.list()
      ])
      if (oRes.success) setOrders(oRes.data)
      if (sRes.success) setStores(sRes.data)
    } catch (e) { }
  }

  useEffect(() => { loadData() }, [filters])

  const paymentLabels = { cash: '现金', card: '刷卡', member: '会员卡' }
  const paymentColors = { cash: 'green', card: 'blue', member: 'purple' }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>订单记录</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tag color="blue">总金额 ¥{orders.reduce((a, o) => a + Number(o.actual_price), 0).toLocaleString()}</Tag>
          <Tag color="purple">{orders.length} 笔</Tag>
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 150 }}>
            <Select label="" value={filters.store_id} onChange={(v) => setFilters({ ...filters, store_id: v })}
              options={stores.map(s => ({ value: s.id, label: s.name }))} placeholder="所有门店" style={{ marginBottom: 0 }} />
          </div>
          <div style={{ minWidth: 120 }}>
            <Select label="" value={filters.payment_method} onChange={(v) => setFilters({ ...filters, payment_method: v })} options={[
              { value: '', label: '所有支付' },
              { value: 'cash', label: '现金' },
              { value: 'card', label: '刷卡' },
              { value: 'member', label: '会员卡' }
            ]} style={{ marginBottom: 0 }} />
          </div>
          <div style={{ minWidth: 140 }}>
            <Input label="" type="date" value={filters.start_date} onChange={(v) => setFilters({ ...filters, start_date: v })} style={{ marginBottom: 0 }} />
          </div>
          <div style={{ minWidth: 140 }}>
            <Input label="" type="date" value={filters.end_date} onChange={(v) => setFilters({ ...filters, end_date: v })} style={{ marginBottom: 0 }} />
          </div>
          <Button variant="secondary" onClick={() => setFilters({ store_id: '', payment_method: '', start_date: '', end_date: '' })}>重置</Button>
        </div>
      </Card>

      <Card>
        <Table
          columns={[
            { key: 'order_no', title: '订单号', render: (r) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#0891b2' }}>{r.order_no}</span> },
            { key: 'store_name', title: '门店' },
            { key: 'service_name', title: '服务项目', render: (r) => <span style={{ fontWeight: 500 }}>{r.service_name}</span> },
            { key: 'employee_name', title: '服务技师' },
            { key: 'member_name', title: '会员', render: (r) => r.member_name ? `${r.member_name}(${r.card_no})` : '-' },
            { key: 'actual_price', title: '实付金额', render: (r) => <span style={{ color: '#0f766e', fontWeight: 600 }}>¥{Number(r.actual_price).toFixed(2)}</span> },
            { key: 'commission', title: '技师提成', render: (r) => `¥${Number(r.commission || 0).toFixed(2)}` },
            { key: 'payment_method', title: '支付方式', render: (r) => <Tag color={paymentColors[r.payment_method]}>{paymentLabels[r.payment_method]}</Tag> },
            { key: 'order_date', title: '下单日期' }
          ]}
          data={orders}
        />
      </Card>
    </div>
  )
}
