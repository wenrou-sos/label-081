import { useState, useEffect } from 'react'
import { Card, StatCard, Button, Input, Select, Modal, Tag } from '../components/UI.jsx'
import { inventoryApi, storesApi, getCurrentUser } from '../services/api.js'

export default function Inventory() {
  const [items, setItems] = useState([])
  const [stores, setStores] = useState([])
  const [categories, setCategories] = useState([])
  const [summary, setSummary] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [isHeadquarters, setIsHeadquarters] = useState(false)
  const [filters, setFilters] = useState({ store_id: '', keyword: '', category: '', low_stock_only: false })
  const [modalType, setModalType] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', unit: '瓶', quantity: 0, min_stock: 0, category: '', remark: '', store_id: '' })
  const [stockForm, setStockForm] = useState({ quantity: '', operator: '', remark: '' })
  const [recordsModal, setRecordsModal] = useState(false)
  const [records, setRecords] = useState({ list: [], total: 0 })
  const [recordItem, setRecordItem] = useState(null)

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    const isHQ = user?.role === 'headquarters'
    setIsHeadquarters(isHQ)

    if (!isHQ && user?.store_id) {
      setFilters(prev => ({ ...prev, store_id: String(user.store_id) }))
    }

    const init = async () => {
      const sRes = await storesApi.list()
      if (sRes.success) setStores(sRes.data)
    }
    init()
  }, [])

  const loadData = async () => {
    try {
      const effectiveStoreId = isHeadquarters ? filters.store_id : (currentUser?.store_id || filters.store_id)
      const [iRes, cRes, sRes] = await Promise.all([
        inventoryApi.list({
          ...filters,
          store_id: effectiveStoreId,
          low_stock_only: filters.low_stock_only ? 'true' : 'false'
        }),
        inventoryApi.categories({ store_id: effectiveStoreId }),
        inventoryApi.summary({ store_id: effectiveStoreId })
      ])
      if (iRes.success) setItems(iRes.data)
      if (cRes.success) setCategories(cRes.data)
      if (sRes.success) setSummary(sRes.data)
    } catch (e) { }
  }

  useEffect(() => {
    if (currentUser) {
      loadData()
    }
  }, [filters, currentUser])

  const openAdd = () => {
    setEditing(null)
    const defaultStoreId = isHeadquarters
      ? (filters.store_id || stores[0]?.id || '')
      : String(currentUser?.store_id || '')
    setForm({ name: '', unit: '瓶', quantity: 0, min_stock: 0, category: '', remark: '', store_id: defaultStoreId })
    setModalType('add')
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      name: item.name,
      unit: item.unit,
      min_stock: item.min_stock,
      category: item.category || '',
      remark: item.remark || '',
      store_id: item.store_id
    })
    setModalType('edit')
  }

  const openStockIn = (item) => {
    setEditing(item)
    setStockForm({ quantity: '', operator: '', remark: '' })
    setModalType('in')
  }

  const openStockOut = (item) => {
    setEditing(item)
    setStockForm({ quantity: '', operator: '', remark: '' })
    setModalType('out')
  }

  const openRecords = async (item) => {
    setRecordItem(item)
    setRecordsModal(true)
    try {
      const res = await inventoryApi.records(item.id, { page_size: 20 })
      if (res.success) setRecords(res.data)
    } catch (e) { }
  }

  const submitAdd = async () => {
    if (!form.name) { alert('请输入物品名称'); return }
    try {
      await inventoryApi.create(form)
      setModalType(null)
      loadData()
    } catch (e) { alert(e.message || '操作失败') }
  }

  const submitEdit = async () => {
    if (!form.name) { alert('请输入物品名称'); return }
    try {
      await inventoryApi.update(editing.id, form)
      setModalType(null)
      loadData()
    } catch (e) { alert(e.message || '操作失败') }
  }

  const submitStockIn = async () => {
    if (!stockForm.quantity || Number(stockForm.quantity) <= 0) { alert('请输入入库数量'); return }
    try {
      await inventoryApi.stockIn({
        item_id: editing.id,
        quantity: Number(stockForm.quantity),
        operator: stockForm.operator,
        remark: stockForm.remark
      })
      setModalType(null)
      loadData()
    } catch (e) { alert(e.message || '入库失败') }
  }

  const submitStockOut = async () => {
    if (!stockForm.quantity || Number(stockForm.quantity) <= 0) { alert('请输入出库数量'); return }
    try {
      await inventoryApi.stockOut({
        item_id: editing.id,
        quantity: Number(stockForm.quantity),
        operator: stockForm.operator,
        remark: stockForm.remark
      })
      setModalType(null)
      loadData()
    } catch (e) { alert(e.message || '出库失败') }
  }

  const handleDelete = async (item) => {
    if (!confirm(`确定要删除「${item.name}」吗？`)) return
    try {
      await inventoryApi.remove(item.id)
      loadData()
    } catch (e) { alert(e.message || '删除失败') }
  }

  const isLowStock = (item) => Number(item.quantity) <= Number(item.min_stock) && Number(item.min_stock) > 0

  const getTypeLabel = (type) => {
    const map = { stock_in: '入库', stock_out: '出库', check: '盘点' }
    return map[type] || type
  }

  const getTypeColor = (type) => {
    const map = { stock_in: 'green', stock_out: 'orange', check: 'blue' }
    return map[type] || 'gray'
  }

  const categoryOptions = categories.map(c => ({ value: c, label: c }))

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>库存管理</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, margin: 0 }}>各门店耗材库存管理、出入库登记</p>
        </div>
        <Button onClick={openAdd}>+ 新增物品</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard title="物品种类" value={summary?.total_items || 0} icon="📦" color="blue" />
        <StatCard title="库存总量" value={summary?.total_quantity || 0} icon="📊" color="green" />
        <StatCard title="低库存预警" value={summary?.low_stock_count || 0} icon="⚠️" color="red" />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {isHeadquarters && (
            <div style={{ minWidth: 160 }}>
              <Select label="" value={filters.store_id} onChange={(v) => setFilters({ ...filters, store_id: v })}
                options={stores.map(s => ({ value: s.id, label: s.name }))}
                placeholder="所有门店" style={{ marginBottom: 0 }} />
            </div>
          )}
          <div style={{ minWidth: 140 }}>
            <Select label="" value={filters.category} onChange={(v) => setFilters({ ...filters, category: v })}
              options={categoryOptions}
              placeholder="全部分类" style={{ marginBottom: 0 }} />
          </div>
          <div style={{ minWidth: 200 }}>
            <Input label="" value={filters.keyword} onChange={(v) => setFilters({ ...filters, keyword: v })}
              placeholder="搜索物品名称" style={{ marginBottom: 0 }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', cursor: 'pointer', padding: '8px 0' }}>
            <input
              type="checkbox"
              checked={filters.low_stock_only}
              onChange={(e) => setFilters({ ...filters, low_stock_only: e.target.checked })}
              style={{ accentColor: '#0891b2' }}
            />
            只看低库存
          </label>
          <Button variant="secondary" onClick={() => setFilters({ store_id: isHeadquarters ? '' : (currentUser?.store_id || ''), keyword: '', category: '', low_stock_only: false })}>重置</Button>
        </div>
      </Card>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['物品名称', '分类', '单位', '当前库存', '最低预警', '所在门店', '状态', '操作'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>暂无数据</td></tr>
              ) : items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                    {item.name}
                    {isLowStock(item) && <Tag color="red" style={{ marginLeft: 8 }}>库存不足</Tag>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>{item.category ? <Tag color="purple">{item.category}</Tag> : '-'}</td>
                  <td style={{ padding: '10px 14px' }}>{item.unit}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: isLowStock(item) ? '#dc2626' : '#0f766e' }}>
                    {Number(item.quantity)}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{Number(item.min_stock)}</td>
                  <td style={{ padding: '10px 14px' }}>{item.store_name || '-'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {item.status === 'active'
                      ? <Tag color="green">正常</Tag>
                      : <Tag color="gray">停用</Tag>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => openStockIn(item)} style={actionBtnStyle('#10b981')}>入库</button>
                      <button onClick={() => openStockOut(item)} style={actionBtnStyle('#f59e0b')}>出库</button>
                      <button onClick={() => openRecords(item)} style={actionBtnStyle('#6366f1')}>流水</button>
                      <button onClick={() => openEdit(item)} style={actionBtnStyle('#0891b2')}>编辑</button>
                      <button onClick={() => handleDelete(item)} style={actionBtnStyle('#ef4444')}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalType === 'add'} onClose={() => setModalType(null)} title="新增库存物品" width={480}>
        {isHeadquarters ? (
          <Select label="所属门店" value={form.store_id} onChange={(v) => setForm({ ...form, store_id: v })}
            options={stores.map(s => ({ value: s.id, label: s.name }))} placeholder="请选择门店" />
        ) : (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: 500 }}>所属门店</div>
            <div style={{
              padding: '9px 12px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 14,
              color: '#334155'
            }}>
              {stores.find(s => s.id === Number(currentUser?.store_id))?.name || currentUser?.store_name || '-'}
            </div>
          </div>
        )}
        <Input label="物品名称" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="如：薰衣草精油" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="单位" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })}
            options={[
              { value: '瓶', label: '瓶' },
              { value: '盒', label: '盒' },
              { value: '条', label: '条' },
              { value: '包', label: '包' },
              { value: '根', label: '根' },
              { value: '个', label: '个' }
            ]} />
          <Input label="初始库存" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="分类" value={form.category} onChange={(v) => setForm({ ...form, category: v })}
            options={categoryOptions}
            placeholder="请选择分类" />
          <Input label="最低预警量" type="number" value={form.min_stock} onChange={(v) => setForm({ ...form, min_stock: v })} placeholder="低于此数量将预警" />
        </div>
        <Input label="备注" value={form.remark} onChange={(v) => setForm({ ...form, remark: v })} placeholder="选填" />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="secondary" onClick={() => setModalType(null)}>取消</Button>
          <Button onClick={submitAdd}>确认添加</Button>
        </div>
      </Modal>

      <Modal open={modalType === 'edit'} onClose={() => setModalType(null)} title="编辑物品" width={480}>
        <Input label="物品名称" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="单位" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })}
            options={[
              { value: '瓶', label: '瓶' },
              { value: '盒', label: '盒' },
              { value: '条', label: '条' },
              { value: '包', label: '包' },
              { value: '根', label: '根' },
              { value: '个', label: '个' }
            ]} />
          <Input label="最低预警量" type="number" value={form.min_stock} onChange={(v) => setForm({ ...form, min_stock: v })} />
        </div>
        <Select label="分类" value={form.category} onChange={(v) => setForm({ ...form, category: v })}
          options={categoryOptions} placeholder="选择分类" />
        <Input label="备注" value={form.remark} onChange={(v) => setForm({ ...form, remark: v })} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="secondary" onClick={() => setModalType(null)}>取消</Button>
          <Button onClick={submitEdit}>保存</Button>
        </div>
      </Modal>

      <Modal open={modalType === 'in'} onClose={() => setModalType(null)} title={`入库 - ${editing?.name || ''}`} width={440}>
        {editing && (
          <>
            <div style={{ padding: 14, background: '#f0fdfa', borderRadius: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>当前库存</span>
                <span style={{ color: '#0f766e', fontWeight: 700, fontSize: 18 }}>
                  {Number(editing.quantity)} {editing.unit}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>最低预警</span>
                <span style={{ color: '#64748b' }}>{Number(editing.min_stock)} {editing.unit}</span>
              </div>
            </div>
            <Input label="入库数量" type="number" value={stockForm.quantity} onChange={(v) => setStockForm({ ...stockForm, quantity: v })} placeholder="请输入入库数量" />
            <Input label="操作人" value={stockForm.operator} onChange={(v) => setStockForm({ ...stockForm, operator: v })} placeholder="选填" />
            <Input label="备注" value={stockForm.remark} onChange={(v) => setStockForm({ ...stockForm, remark: v })} placeholder="选填，如：采购入库" />
            {stockForm.quantity && Number(stockForm.quantity) > 0 && (
              <div style={{ padding: 12, background: '#fefce8', borderRadius: 8, fontSize: 13 }}>
                入库后库存：<span style={{ fontWeight: 700, color: '#0f766e' }}>
                  {Number(editing.quantity) + Number(stockForm.quantity)} {editing.unit}
                </span>
              </div>
            )}
          </>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="secondary" onClick={() => setModalType(null)}>取消</Button>
          <Button variant="success" onClick={submitStockIn}>确认入库</Button>
        </div>
      </Modal>

      <Modal open={modalType === 'out'} onClose={() => setModalType(null)} title={`出库 - ${editing?.name || ''}`} width={440}>
        {editing && (
          <>
            <div style={{ padding: 14, background: '#fef2f2', borderRadius: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>当前库存</span>
                <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 18 }}>
                  {Number(editing.quantity)} {editing.unit}
                </span>
              </div>
              {isLowStock(editing) && <div style={{ fontSize: 12, color: '#dc2626' }}>⚠️ 当前库存已低于预警线</div>}
            </div>
            <Input label="出库数量" type="number" value={stockForm.quantity} onChange={(v) => setStockForm({ ...stockForm, quantity: v })} placeholder="请输入出库数量" />
            <Input label="操作人" value={stockForm.operator} onChange={(v) => setStockForm({ ...stockForm, operator: v })} placeholder="选填" />
            <Input label="备注" value={stockForm.remark} onChange={(v) => setStockForm({ ...stockForm, remark: v })} placeholder="选填，如：门店领用" />
            {stockForm.quantity && Number(stockForm.quantity) > 0 && (
              <div style={{ padding: 12, background: Number(editing.quantity) - Number(stockForm.quantity) < 0 ? '#fee2e2' : '#fefce8', borderRadius: 8, fontSize: 13 }}>
                出库后库存：<span style={{ fontWeight: 700, color: Number(editing.quantity) - Number(stockForm.quantity) < 0 ? '#dc2626' : '#0f766e' }}>
                  {Math.max(0, Number(editing.quantity) - Number(stockForm.quantity))} {editing.unit}
                </span>
                {Number(stockForm.quantity) > Number(editing.quantity) && <span style={{ color: '#dc2626', marginLeft: 8 }}>（库存不足）</span>}
              </div>
            )}
          </>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="secondary" onClick={() => setModalType(null)}>取消</Button>
          <Button onClick={submitStockOut} variant="danger">确认出库</Button>
        </div>
      </Modal>

      <Modal open={recordsModal} onClose={() => setRecordsModal(false)} title={`流水记录 - ${recordItem?.name || ''}`} width={600}>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {records.list?.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>暂无流水记录</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['时间', '类型', '数量', '变动前', '变动后', '操作人', '备注'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.list?.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#64748b' }}>
                      {new Date(r.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td style={{ padding: '8px 12px' }}><Tag color={getTypeColor(r.type)}>{getTypeLabel(r.type)}</Tag></td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: r.type === 'stock_in' ? '#0f766e' : '#dc2626' }}>
                      {r.type === 'stock_in' ? '+' : '-'}{Number(r.quantity)} {r.unit}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{Number(r.before_quantity)} {r.unit}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{Number(r.after_quantity)} {r.unit}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{r.operator || '-'}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b', fontSize: 12, maxWidth: 120 }}>{r.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Button onClick={() => setRecordsModal(false)}>关闭</Button>
        </div>
      </Modal>
    </div>
  )
}

const actionBtnStyle = (color) => ({
  background: 'transparent',
  color,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 500,
  padding: '4px 8px',
  borderRadius: 4,
  fontSize: 13
})
