export function Badge({ value, children }) {
  const tone = ['yes', 'pass', 'completed'].includes(value) ? 'success'
    : ['no', 'fail'].includes(value) ? 'danger'
      : ['unknown', 'indeterminate', 'planned'].includes(value) ? 'warning' : 'neutral';
  return <span className={`tensor-badge tensor-badge--${tone}`}>{children ?? value}</span>;
}

export function Panel({ as: Tag = 'section', className = '', children, ...props }) {
  return <Tag className={`tensor-panel ${className}`} {...props}>{children}</Tag>;
}
