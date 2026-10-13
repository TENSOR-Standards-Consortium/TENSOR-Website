export function Badge({ value, children }) {
  const tone = ['yes', 'pass', 'completed'].includes(value) ? 'success'
    : ['no', 'fail'].includes(value) ? 'danger'
      : ['unknown', 'indeterminate', 'planned'].includes(value) ? 'warning' : 'neutral';
  return <span className={`tensor-badge tensor-badge--${tone}`}>{children ?? value}</span>;
}

export function Panel({ as: Tag = 'section', className = '', children, ...props }) {
  return <Tag className={`tensor-panel ${className}`} {...props}>{children}</Tag>;
}

export function WorkspaceHeading({ title, eyebrow, children, className = '' }) {
  return <div className={`workspace-heading ${className}`}>
    <div><p className="section-kicker">{eyebrow}</p><h1 className="workspace-title">{title}<span aria-hidden="true">.</span></h1></div>
    {children}
  </div>;
}
