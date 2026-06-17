import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '../components/UI.jsx'
import { authApi, setToken, setCurrentUser, clearAuth } from '../services/api.js'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) {
      setError('请输入用户名和密码')
      return
    }

    setLoading(true)
    setError('')

    try {
      clearAuth()
      const res = await authApi.login(form)
      if (res.success) {
        setToken(res.data.token)
        setCurrentUser(res.data.user)
        navigate('/dashboard', { replace: true })
      } else {
        setError(res.message || '登录失败')
      }
    } catch (e) {
      setError(e.message || '登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        padding: 40
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #0891b2, #0e7490)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 32
          }}>
            🦶
          </div>
          <h1 style={{ color: '#f8fafc', fontSize: 24, fontWeight: 700, margin: 0 }}>足浴连锁管理系统</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 8, marginBottom: 0 }}>请登录以继续</p>
        </div>

        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                padding: '12px 16px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 20
              }}>
                {error}
              </div>
            )}

            <Input
              label="用户名"
              value={form.username}
              onChange={(v) => setForm({ ...form, username: v })}
              placeholder="请输入用户名"
            />

            <Input
              label="密码"
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              placeholder="请输入密码"
            />

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              style={{ width: '100%', marginTop: 8 }}
            >
              {loading ? '登录中...' : '登 录'}
            </Button>
          </form>

          <div style={{
            marginTop: 24,
            padding: 16,
            background: '#f8fafc',
            borderRadius: 8,
            fontSize: 12,
            color: '#64748b'
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#475569' }}>测试账号：</div>
            <div>• 总部管理员：admin / 123456</div>
            <div>• 门店经理（旗舰店）：store1 / 123456</div>
            <div>• 门店经理（朝阳门店）：store2 / 123456</div>
          </div>
        </div>
      </div>
    </div>
  )
}
