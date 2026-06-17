import { useState, useEffect } from 'react'
import { Card, StatCard, Button, Select, Modal, Tag } from '../components/UI.jsx'
import { employeePerformanceApi, storesApi, getCurrentUser, getToken } from '../services/api.js'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#0891b2', '#10b981', '#8b5cf6', '#f97316', '#ef4444', '#eab308', '#ec4899', '#14b8a6']

const PERIOD_OPTIONS = [
  { value: 'month', label: '本月' },
  { value: 'quarter', label: '本季' },
  { value: 'year', label: '本年' }
]

const RANK_MEDALS = ['🥇', '🥈', '🥉']

export default function EmployeePerformance() {
  const [summary, setSummary] = useState(null)
  const [ranking, setRanking] = useState([])
  const [total, setTotal] = useState(0)
  const [stores, setStores] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [isHeadquarters, setIsHeadquarters] = useState(false)
  const [filters, setFilters] = useState({ store_id: '', period: 'month' })
  const [loading, setLoading] = useState(false)
  const [detailModal, setDetailModal] = useState(false)
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    const isHQ = user?.role === 'headquarters'
    setIsHeadquarters(isHQ)

    if (!isHQ && user?.store_id) {
      setFilters(prev => ({ ...prev, store_id: String(user.store_id) }))
    }

    const init = async () => {
      if (isHQ) {
        const sRes = await storesApi.list()
        if (sRes.success) setStores(sRes.data)
      }
    }
    init()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const effectiveStoreId = isHeadquarters ? filters.store_id : (currentUser?.store_id || filters.store_id)
      const params = { store_id: effectiveStoreId, period: filters.period }
      const [sumRes, rankRes] = await Promise.all([
        employeePerformanceApi.summary(params),
        employeePerformanceApi.ranking({ ...params, page_size: 100 })
      ])
      if (sumRes.success) setSummary(sumRes.data)
      if (rankRes.success) {
        setRanking(rankRes.data.list)
        setTotal(rankRes.data.total)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser) {
      loadData()
    }
  }, [filters, currentUser])

  const openDetail = async (employeeId) => {
    setDetailLoading(true)
    setDetailModal(true)
    try {
      const res = await employeePerformanceApi.detail(employeeId)
      if (res.success) setDetailData(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const effectiveStoreId = isHeadquarters ? filters.store_id : (currentUser?.store_id || filters.store_id)
      const response = await employeePerformanceApi.exportCsv({
        store_id: effectiveStoreId,
        period: filters.period
      })

      const blob = new Blob([response], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `技师业绩排行_${filters.period}_${new Date().toLocaleDateString('zh-CN')}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('导出失败', e)
    }
  }

  const periodLabel = PERIOD_OPTIONS.find(p => p.value === filters.period)?.label || '本月'

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>技师业绩看板</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, margin: 0 }}>
            技师业绩统计与排行 · 数据更新于 {new Date().toLocaleDateString('zh-CN')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <Button variant="secondary" onClick={handleExport}>📥 导出CSV</Button>
          <Button onClick={loadData}>🔄 刷新数据</Button>
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {isHeadquarters && (
            <div style={{ minWidth: 180 }}>
              <Select label="" value={filters.store_id} onChange={(v) => setFilters({ ...filters, store_id: v })}
                options={stores.map(s => ({ value: s.id, label: s.name }))}
                placeholder="全部门店" style={{ marginBottom: 0 }} />
            </div>
          )}
          <div style={{ minWidth: 120 }}>
            <Select label="" value={filters.period} onChange={(v) => setFilters({ ...filters, period: v })}
              options={PERIOD_OPTIONS}
              style={{ marginBottom: 0 }} />
          </div>
          <div style={{ fontSize: 13, color: '#64748b', paddingBottom: 10 }}>
            统计周期：{summary?.start_date} 至 {summary?.end_date}
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard
          title={`${periodLabel}总技师数`}
          value={summary?.total_technicians || 0}
          icon="👤"
          color="blue"
        />
        <StatCard
          title={`${periodLabel}上钟总人次`}
          value={summary?.total_orders || 0}
          icon="⏰"
          color="green"
        />
        <StatCard
          title={`${periodLabel}总提成金额`}
          value={`¥${Number(summary?.total_commission || 0).toLocaleString()}`}
          icon="💰"
          color="orange"
        />
        <StatCard
          title={`${periodLabel}人均提成`}
          value={`¥${Number(summary?.avg_commission || 0).toLocaleString()}`}
          icon="📊"
          color="purple"
        />
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0 }}>
            {periodLabel}个人业绩排行
          </h3>
          <div style={{ fontSize: 12, color: '#64748b' }}>共 {total} 名技师</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>加载中...</div>
        ) : ranking.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>暂无数据</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['排名', '技师', '所属门店', '上钟次数', '服务项目分布', '总营业额', '提成金额'].map(h => (
                    <th key={h} style={{
                      textAlign: h === '排名' ? 'center' : 'left',
                      padding: '12px 16px', fontSize: 12,
                      fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranking.map((item, index) => {
                  const rank = item.rank || index + 1
                  const medal = RANK_MEDALS[rank - 1]
                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                      onClick={() => openDetail(item.id)}
                    >
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 15, fontWeight: 700, color: rank <= 3 ? '#f59e0b' : '#94a3b8' }}>
                        {medal || rank}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #0891b2, #0e7490)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 600, fontSize: 14
                          }}>
                            {item.name?.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{item.name}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.emp_no}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>
                        {item.store_name}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 14, color: '#334155', fontWeight: 500 }}>
                        {item.order_count} 次
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748b', maxWidth: 200 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {item.service_distribution?.slice(0, 3).map((s, i) => (
                            <Tag key={i} color={['blue', 'green', 'purple', 'orange'][i % 4]} size="sm">
                              {s.name} {s.count}次
                            </Tag>
                          ))}
                          {item.service_distribution?.length > 3 && (
                            <Tag color="gray" size="sm">+{item.service_distribution.length - 3}</Tag>
                          )}
                          {(!item.service_distribution || item.service_distribution.length === 0) && (
                            <span style={{ color: '#cbd5e1' }}>暂无</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 14, color: '#0f766e', fontWeight: 600 }}>
                        ¥{Number(item.total_revenue).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 14, color: '#ea580c', fontWeight: 700 }}>
                        ¥{Number(item.total_commission).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={detailModal}
        onClose={() => setDetailModal(false)}
        title={detailData ? `${detailData.employee?.name} 的业绩详情` : '技师业绩详情'}
        width={860}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>加载中...</div>
        ) : detailData ? (
          <div>
            <div style={{
              padding: 16,
              background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfeff 100%)',
              borderRadius: 12,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 16
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0891b2, #0e7490)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 22
              }}>
                {detailData.employee?.name?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{detailData.employee?.name}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                  {detailData.employee?.store_name} · 工号：{detailData.employee?.emp_no}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>近6个月总提成</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#ea580c' }}>
                  ¥{Number(detailData.summary?.total_commission_6m || 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>近6个月上钟</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0891b2' }}>{detailData.summary?.total_orders_6m} 次</div>
              </div>
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>月均提成</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>¥{Number(detailData.summary?.avg_monthly_commission || 0).toLocaleString()}</div>
              </div>
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>平均单价</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#8b5cf6' }}>
                  ¥{detailData.summary?.total_orders_6m > 0
                    ? Math.round(detailData.summary?.total_commission_6m / detailData.summary?.total_orders_6m)
                    : 0}
                </div>
              </div>
            </div>

            <Card style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0, marginBottom: 12 }}>近6个月业绩趋势</h4>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={detailData.monthly_stats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === '上钟次数') return [`${value} 次`, '上钟次数']
                        return [`¥${Number(value).toLocaleString()}`, name]
                      }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="order_count" stroke="#0891b2" strokeWidth={2.5} dot={{ fill: '#0891b2', r: 5 }} name="上钟次数" />
                    <Line yAxisId="right" type="monotone" dataKey="total_commission" stroke="#f97316" strokeWidth={2.5} dot={{ fill: '#f97316', r: 5 }} name="提成金额" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0, marginBottom: 12 }}>本月项目分布（次数）</h4>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={detailData.service_stats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={70} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0891b2" radius={[0, 4, 4, 0]} name="次数" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0, marginBottom: 12 }}>本月提成分布</h4>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={detailData.service_stats}
                        dataKey="commission"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                      >
                        {detailData.service_stats.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `¥${Number(v).toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
