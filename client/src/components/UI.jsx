export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      padding: 20,
      ...style
    }}>
      {children}
    </div>
  )
}

export function Button({ children, onClick, variant = 'primary', size = 'md', style = {}, disabled }) {
  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #0891b2, #0e7490)',
      color: '#fff',
      border: 'none'
    },
    secondary: {
      background: '#f1f5f9',
      color: '#334155',
      border: '1px solid #e2e8f0'
    },
    danger: {
      background: '#ef4444',
      color: '#fff',
      border: 'none'
    },
    success: {
      background: '#10b981',
      color: '#fff',
      border: 'none'
    }
  }
  const sizes = {
    sm: { padding: '6px 14px', fontSize: 13 },
    md: { padding: '8px 20px', fontSize: 14 },
    lg: { padding: '12px 28px', fontSize: 15 }
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant],
        ...sizes[size],
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 500,
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s',
        ...style
      }}
    >
      {children}
    </button>
  )
}

export function Input({ label, value, onChange, type = 'text', placeholder, style = {} }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: 500 }}>{label}</div>}
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '9px 12px',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          fontSize: 14,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s',
          ...style
        }}
        onFocus={(e) => e.target.style.borderColor = '#0891b2'}
        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
      />
    </div>
  )
}

export function Select({ label, value, onChange, options, placeholder, style = {} }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: 500 }}>{label}</div>}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '9px 12px',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          fontSize: 14,
          outline: 'none',
          background: '#fff',
          cursor: 'pointer',
          boxSizing: 'border-box',
          ...style
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

export function TextArea({ label, value, onChange, rows = 4, style = {} }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: 500 }}>{label}</div>}
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{
          width: '100%',
          padding: '9px 12px',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          fontSize: 14,
          outline: 'none',
          fontFamily: 'inherit',
          resize: 'vertical',
          boxSizing: 'border-box',
          ...style
        }}
      />
    </div>
  )
}

export function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }} onClick={onClose}>
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: width,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div style={{
            padding: '18px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1e293b', margin: 0 }}>{title}</h3>
            <span onClick={onClose} style={{
              cursor: 'pointer', fontSize: 22, color: '#94a3b8', lineHeight: 1
            }}>×</span>
          </div>
        )}
        <div style={{ padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function Table({ columns, data, actions }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {columns.map(col => (
              <th key={col.key} style={{
                textAlign: 'left',
                padding: '12px 16px',
                fontSize: 12,
                fontWeight: 600,
                color: '#64748b',
                borderBottom: '2px solid #e2e8f0',
                whiteSpace: 'nowrap'
              }}>
                {col.title}
              </th>
            ))}
            {actions && <th style={{
              textAlign: 'left',
              padding: '12px 16px',
              fontSize: 12,
              fontWeight: 600,
              color: '#64748b',
              borderBottom: '2px solid #e2e8f0'
            }}>操作</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} style={{
                padding: 40,
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: 14
              }}>暂无数据</td>
            </tr>
          ) : data.map((row, idx) => (
            <tr key={row.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
              {columns.map(col => (
                <td key={col.key} style={{
                  padding: '12px 16px',
                  fontSize: 14,
                  color: '#334155'
                }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
              {actions && (
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {actions.map(act => (
                      <span
                        key={act.label}
                        onClick={() => act.onClick(row)}
                        style={{
                          color: act.color || '#0891b2',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 500
                        }}
                      >
                        {act.label}
                      </span>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Tag({ children, color = 'blue' }) {
  const colors = {
    blue: { bg: '#e0f2fe', text: '#0369a1' },
    green: { bg: '#dcfce7', text: '#166534' },
    red: { bg: '#fee2e2', text: '#991b1b' },
    yellow: { bg: '#fef9c3', text: '#854d0e' },
    purple: { bg: '#f3e8ff', text: '#7c3aed' },
    gray: { bg: '#f1f5f9', text: '#475569' }
  }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      fontSize: 12,
      fontWeight: 500,
      borderRadius: 12,
      background: colors[color]?.bg || colors.gray.bg,
      color: colors[color]?.text || colors.gray.text
    }}>
      {children}
    </span>
  )
}

export function StatCard({ title, value, icon, trend, color = 'blue' }) {
  const gradients = {
    blue: 'linear-gradient(135deg, #0891b2, #0e7490)',
    green: 'linear-gradient(135deg, #10b981, #059669)',
    purple: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    orange: 'linear-gradient(135deg, #f97316, #ea580c)'
  }
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{value}</div>
          {trend && (
            <div style={{ fontSize: 12, color: trend >= 0 ? '#16a34a' : '#dc2626', marginTop: 4 }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: gradients[color],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26
        }}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
