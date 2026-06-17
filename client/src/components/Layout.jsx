import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'

const menuItems = [
  { path: '/dashboard', label: '数据看板', icon: '📊', group: '总部管理' },
  { path: '/stores', label: '门店管理', icon: '🏪', group: '总部管理' },
  { path: '/services', label: '项目定价', icon: '📋', group: '总部管理' },
  { path: '/member-levels', label: '会员体系', icon: '💎', group: '总部管理' },
  { path: '/employees', label: '员工管理', icon: '👥', group: '人事管理' },
  { path: '/members', label: '会员管理', icon: '💳', group: '门店运营' },
  { path: '/orders', label: '订单记录', icon: '💰', group: '门店运营' },
  { path: '/shift-reports', label: '交接班报表', icon: '📝', group: '门店运营' },
]

export default function Layout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const groups = {}
  menuItems.forEach(item => {
    if (!groups[item.group]) groups[item.group] = []
    groups[item.group].push(item)
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: collapsed ? 64 : 240,
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          color: '#e2e8f0',
          transition: 'width 0.3s',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        <div style={{
          padding: collapsed ? '16px 12px' : '20px 20px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          cursor: 'pointer'
        }} onClick={() => setCollapsed(!collapsed)}>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>足浴连锁管理</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>总部管理平台</div>
            </div>
          )}
          <span style={{ fontSize: 20 }}>{collapsed ? '▶' : '◀'}</span>
        </div>

        <nav style={{ padding: '12px 8px' }}>
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 16 }}>
              {!collapsed && (
                <div style={{
                  fontSize: 11,
                  color: '#64748b',
                  padding: '8px 12px',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontWeight: 600
                }}>
                  {group}
                </div>
              )}
              {items.map(item => {
                const active = location.pathname === item.path
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: collapsed ? '12px 0' : '10px 14px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: active ? '#fff' : '#cbd5e1',
                      background: active ? 'linear-gradient(90deg, #0891b2 0%, #0e7490 100%)' : 'transparent',
                      marginBottom: 4,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    {!collapsed && <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 500 }}>{item.label}</span>}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>
              {menuItems.find(m => m.path === location.pathname)?.label || '管理平台'}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{
              padding: '4px 12px',
              background: '#dcfce7',
              color: '#166534',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500
            }}>总部管理员</span>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0891b2, #0e7490)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 600, fontSize: 14
            }}>A</div>
          </div>
        </header>

        <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
