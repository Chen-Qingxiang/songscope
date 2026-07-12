import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: number
  detail: string
}

export function StatCard({ icon: Icon, label, value, detail }: StatCardProps) {
  return (
    <article className="stat-card">
      <span className="stat-icon"><Icon size={18} /></span>
      <div>
        <p className="eyebrow">{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  )
}
