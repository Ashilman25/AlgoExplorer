import { CheckCircle2 } from 'lucide-react'


export default function ComingSoon({ icon: Icon, title, description, features = [] }) {
  return (
    <div className = "flex flex-col items-center justify-center min-h-[52vh] py-10 text-center animate-enter stagger-1">
      {Icon && (
        <div className = "p-4 rounded-2xl bg-hover border border-hairline mb-5">
          <Icon size = {28} strokeWidth = {1} className="text-faint" />
        </div>
      )}

      <h2 className = "text-base font-semibold text-secondary mb-2 max-w-sm">
        {title}
      </h2>

      <p className = "text-sm text-muted mb-8 max-w-md leading-relaxed">
        {description}
      </p>

      {features.length > 0 && (
        <ul className = "space-y-2 text-left max-w-xs">
          {features.map((f, i) => (
            <li key = {i} className = "flex items-start gap-2.5 text-sm text-muted">
              <CheckCircle2
                size = {14}
                strokeWidth = {1.5}
                className = "text-faint mt-0.5 shrink-0"
              />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
