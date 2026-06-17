import { useState, useEffect } from 'react'
import { Card, StatCard, Tag, Button } from '../components/UI.jsx'
import { dashboardApi } from '../services/api.js'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from 'recharts'

const COLORS = ['#0891b2', '#10b981', '#8b5cf6', '#f97316', '#ef4444', '#eab308']

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [sumRes, trendRes] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.trend(7)
      ])
      if (sumRes.success) setSummary(sumRes.data)
      if (trendRes.success) setTrend(trendRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const pieData = summary?.service_sales?.map(s => ({
    name: s.name,
    value: Number(s.amount) || 0
  })) || []

  const barData = summary?.store_ranking?.map(s => ({
    name: s.name,
    revenue: Number(s.revenue) || 0
  })) || []

  const paymentData = summary?.payment_stats?.map(p => ({
    name: p.payment_method === 'cash' ? '现金' : p.payment_method === 'card' ? '刷卡' : '会员卡',
    amount: Number(p.amount) || 0
  })) || []

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>总部数据看板</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, margin: 0 }}>
            全品牌经营数据实时汇总 · {new Date().toLocaleDateString('zh-CN')}
          </p>
        </div>
        <Button onClick={loadData}>🔄 刷新数据</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard title="全品牌总营收" value={`¥${Number(summary?.total_revenue || 0).toLocaleString()}`} icon="💰" color="blue" />
        <StatCard title="会员充值总额" value={`¥${Number(summary?.total_recharge || 0).toLocaleString()}`} icon="💎" color="purple" />
        <StatCard title="活跃会员数" value={summary?.member_stats?.total_members || 0} icon="👥" color="green" />
        <StatCard title="会员总余额" value={`¥${Number(summary?.member_stats?.total_balance || 0).toLocaleString()}`} icon="💳" color="orange" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0, marginBottom: 16 }}>营收趋势（近7天）</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip formatter={(v) => `¥${Number(v).toLocaleString()}`} />
                <Line type="monotone" dataKey="revenue" stroke="#0891b2" strokeWidth={3} dot={{ fill: '#0891b2', r: 4 }} name="营收" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0, marginBottom: 16 }}>支付方式占比</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `¥${Number(v).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0, marginBottom: 16 }}>各门店营收排行</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} width={80} />
                <Tooltip formatter={(v) => `¥${Number(v).toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#0891b2" radius={[0, 6, 6, 0]} name="营收" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0, marginBottom: 16 }}>各项目销售占比</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `¥${Number(v).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 20 }}>
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0, marginBottom: 16 }}>各项目销售明细</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['项目名称', '分类', '销售数量', '销售金额', '占比'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '12px 16px', fontSize: 12,
                      fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary?.service_sales?.map(s => {
                  const total = summary.service_sales.reduce((acc, x) => acc + Number(x.amount), 0)
                  const pct = total ? (Number(s.amount) / total * 100).toFixed(1) : 0
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#334155', fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14 }}><Tag color="purple">{s.category}</Tag></td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#334155' }}>{s.count}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#0f766e', fontWeight: 600 }}>¥{Number(s.amount).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#334155' }}>{pct}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
