interface FlowMetricProps {
  label: string
  value: number
  tone?: 'signal' | 'amber' | 'slate'
  delayClass?: string
}

const toneClasses = {
  signal: 'text-signal-deep bg-signal-soft/70 border-signal/20',
  amber: 'text-amber-800 bg-amber-50 border-amber-200/70',
  slate: 'text-ink bg-canvas-soft border-canvas-line',
}

export default function FlowMetric({
  label,
  value,
  tone = 'slate',
  delayClass = '',
}: FlowMetricProps) {
  return (
    <div
      className={`mc-reveal ${delayClass} inline-flex items-center gap-2.5 px-3.5 py-2 border ${toneClasses[tone]}
        rounded-xl rounded-tr-sm transition-transform duration-200 hover:-translate-y-0.5`}
    >
      <span className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">{label}</span>
      <span className="font-display text-lg font-semibold tabular-nums leading-none">{value}</span>
    </div>
  )
}
