import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Tag } from '../components/UI.jsx'
import { shiftReportsApi } from '../services/api.js'

function SignaturePad({ onSave, label, disabled }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1e293b'
  }, [])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const start = (e) => {
    if (disabled) return
    e.preventDefault()
    setDrawing(true)
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (e) => {
    if (!drawing || disabled) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const end = () => setDrawing(false)

  const clear = () => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setSaved(false)
  }

  const save = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onSave(dataUrl)
    setSaved(true)
  }

  return (
    <div style={{
      padding: 16,
      background: saved ? '#f0fdf4' : '#fafafa',
      border: `2px dashed ${saved ? '#86efac' : '#d4d4d8'}`,
      borderRadius: 12
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{label}</div>
        {saved && <Tag color="green">✓ 已签字</Tag>}
      </div>
      <canvas
        ref={canvasRef}
        width={420}
        height={140}
        style={{
          width: '100%',
          maxWidth: 420,
          height: 140,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          cursor: disabled ? 'not-allowed' : 'crosshair',
          touchAction: 'none'
        }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      {!disabled && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <Button size="sm" variant="secondary" onClick={clear}>清除</Button>
          <Button size="sm" onClick={save}>确认签字</Button>
        </div>
      )}
    </div>
  )
}

export default function ShiftReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [handoverSig, setHandoverSig] = useState('')
  const [takeoverSig, setTakeoverSig] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await shiftReportsApi.get(id)
      if (res.success) {
        setReport(res.data)
        setHandoverSig(res.data.handover_signature || '')
        setTakeoverSig(res.data.takeover_signature || '')
      }
    } catch (e) { }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [id])

  const confirmHandover = async () => {
    if (!handoverSig || !takeoverSig) {
      alert('请双方都完成签字后再确认'); return
    }
    if (!confirm('确认完成交接班？确认后将不可修改。')) return
    try {
      await shiftReportsApi.confirm(id, { handover_signature: handoverSig, takeover_signature: takeoverSig })
      alert('交接班确认成功！')
      loadData()
    } catch (e) { alert(e.message || '确认失败') }
  }

  if (loading) return <Card>加载中...</Card>
  if (!report) return <Card>报表不存在</Card>

  const confirmed = report.status === 'confirmed'
  let serviceDetails = [], techDetails = []
  try { if (report.service_details) serviceDetails = typeof report.service_details === 'string' ? JSON.parse(report.service_details) : report.service_details } catch (e) { }
  try { if (report.technician_details) techDetails = typeof report.technician_details === 'string' ? JSON.parse(report.technician_details) : report.technician_details } catch (e) { }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button variant="secondary" onClick={() => navigate('/shift-reports')}>← 返回</Button>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>交班报表 #{report.id}</h2>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              {report.store_name} · {report.shift_name || '未指定班次'} · {report.report_date}
            </div>
          </div>
        </div>
        {confirmed ? <Tag color="green">✓ 已确认交接</Tag> : <Tag color="yellow">待签字确认</Tag>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <Card><div style={{ fontSize: 13, color: '#64748b' }}>本班接待人数</div><div style={{ fontSize: 26, fontWeight: 700, color: '#0891b2', marginTop: 6 }}>{report.customer_count} <span style={{ fontSize: 14, fontWeight: 400 }}>人</span></div></Card>
        <Card><div style={{ fontSize: 13, color: '#64748b' }}>现金收入</div><div style={{ fontSize: 26, fontWeight: 700, color: '#10b981', marginTop: 6 }}>¥{Number(report.cash_amount).toLocaleString()}</div></Card>
        <Card><div style={{ fontSize: 13, color: '#64748b' }}>刷卡收入</div><div style={{ fontSize: 26, fontWeight: 700, color: '#8b5cf6', marginTop: 6 }}>¥{Number(report.card_amount).toLocaleString()}</div></Card>
        <Card><div style={{ fontSize: 13, color: '#64748b' }}>会员卡收入</div><div style={{ fontSize: 26, fontWeight: 700, color: '#f97316', marginTop: 6 }}>¥{Number(report.member_amount).toLocaleString()}</div></Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0, marginBottom: 16 }}>📋 各项目销售明细</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                {['项目', '数量', '金额'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {serviceDetails.length === 0 ? <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>无数据</td></tr> :
                  serviceDetails.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 500 }}>{s.service_name} <Tag color="gray" style={{ marginLeft: 6 }}>{s.category}</Tag></td>
                      <td style={{ padding: '10px 14px', fontSize: 14 }}>{s.count} 单</td>
                      <td style={{ padding: '10px 14px', fontSize: 14, color: '#0f766e', fontWeight: 600 }}>¥{Number(s.amount).toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0, marginBottom: 16 }}>👤 技师上钟明细</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                {['技师', '上钟数', '提成'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {techDetails.length === 0 ? <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>无数据</td></tr> :
                  techDetails.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 500 }}>{t.employee_name}</td>
                      <td style={{ padding: '10px 14px', fontSize: 14 }}>{t.count} 单</td>
                      <td style={{ padding: '10px 14px', fontSize: 14, color: '#f97316', fontWeight: 600 }}>¥{Number(t.commission).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0, marginBottom: 16 }}>✍️ 交接班签字确认</h3>
        <div style={{
          padding: 20,
          background: 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)',
          borderRadius: 12,
          marginBottom: 16,
          fontSize: 14,
          color: '#854d0e'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠️ 请确认本班次所有营收数据无误</div>
          <div style={{ fontSize: 13 }}>
            本班应收总额：<span style={{ fontWeight: 700, fontSize: 18, color: '#92400e' }}>¥{Number(report.total_amount).toLocaleString()}</span>
            &nbsp;&nbsp;（现金 ¥{Number(report.cash_amount).toFixed(2)} + 刷卡 ¥{Number(report.card_amount).toFixed(2)} + 会员卡 ¥{Number(report.member_amount).toFixed(2)}）
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {handoverSig ? (
            <div style={{ padding: 16, background: '#f0fdf4', border: '2px dashed #86efac', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>交班人签字</div>
                <Tag color="green">✓ 已签字</Tag>
              </div>
              <img src={handoverSig} alt="交班签字" style={{ maxWidth: '100%', maxHeight: 140, background: '#fff', borderRadius: 8 }} />
            </div>
          ) : (
            <SignaturePad label="交班人签字" onSave={setHandoverSig} disabled={confirmed} />
          )}

          {takeoverSig ? (
            <div style={{ padding: 16, background: '#f0fdf4', border: '2px dashed #86efac', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>接班人签字</div>
                <Tag color="green">✓ 已签字</Tag>
              </div>
              <img src={takeoverSig} alt="接班签字" style={{ maxWidth: '100%', maxHeight: 140, background: '#fff', borderRadius: 8 }} />
            </div>
          ) : (
            <SignaturePad label="接班人签字" onSave={setTakeoverSig} disabled={confirmed} />
          )}
        </div>

        {!confirmed && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <Button size="lg" onClick={confirmHandover}>✓ 确认完成交接班</Button>
          </div>
        )}

        {confirmed && report.confirmed_at && (
          <div style={{ textAlign: 'center', marginTop: 20, padding: 16, background: '#f0fdf4', borderRadius: 12 }}>
            <div style={{ fontSize: 14, color: '#166534' }}>
              交接确认时间：<span style={{ fontWeight: 600 }}>{new Date(report.confirmed_at).toLocaleString('zh-CN')}</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
