import { createContext, useContext, useState } from 'react'
import { cn } from '../../utils/cn'

const TabsCtx = createContext(null)

export function Tabs({ value, onChange, defaultValue, children, className }) {
  const [internal, setInternal] = useState(defaultValue ?? null)
  const active = value ?? internal
  const setActive = onChange ?? setInternal

  return (
    <TabsCtx.Provider value = {{active, setActive}}>
      <div className = {className}>{children}</div>
    </TabsCtx.Provider>
  )
}

export function TabList({ children, className }) {
  return (
    <div
      role = "tablist"
      className = {cn(
        'flex items-center gap-0.5 border-b border-hairline',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Tab({ value, children, className }) {
  const { active, setActive } = useContext(TabsCtx)
  const isActive = active === value

  return (
    <button
      role = "tab"
      aria-selected = {isActive}
      onClick = {() => setActive(value)}
      className = {cn(
        'px-3 py-2 text-xs font-medium transition-colors duration-fast',
        'border-b-2 -mb-px',
        isActive
          ? 'text-brand-400 border-brand-500'
          : 'text-muted border-transparent hover:text-secondary hover:border-default',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function TabPanel({ value, children, className }) {
  const { active } = useContext(TabsCtx)
  if (active !== value) return null
  return <div className={className}>{children}</div>
}
