import { useState, useCallback } from 'react'
import { Settings, Save, RotateCcw } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import Slider from '../components/ui/Slider'
import { ErrorAlert } from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { useAuthStore } from '../stores/useAuthStore'
import { client, parseApiError } from '../services/client'


const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
]

const VERBOSITY_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'standard', label: 'Standard' },
  { value: 'detailed', label: 'Detailed' },
]

const ANIMATION_OPTIONS = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'standard', label: 'Standard' },
  { value: 'full', label: 'Full' },
]

const COLOR_SCHEME_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'monochrome', label: 'Monochrome' },
  { value: 'colorblind', label: 'Colorblind-friendly' },
]


export default function SettingsPage() {
  const toast = useToast()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const saved = user?.settings || {}

  const [form, setForm] = useState({
    theme: saved.theme ?? 'dark',
    default_playback_speed: saved.default_playback_speed ?? 1.0,
    explanation_verbosity: saved.explanation_verbosity ?? 'standard',
    animation_detail: saved.animation_detail ?? 'standard',
    chart_show_grid: saved.chart_preferences?.show_grid ?? true,
    chart_show_legend: saved.chart_preferences?.show_legend ?? true,
    chart_color_scheme: saved.chart_preferences?.color_scheme ?? 'default',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isDirty =
    form.theme !== (saved.theme ?? 'dark') ||
    form.default_playback_speed !== (saved.default_playback_speed ?? 1.0) ||
    form.explanation_verbosity !== (saved.explanation_verbosity ?? 'standard') ||
    form.animation_detail !== (saved.animation_detail ?? 'standard') ||
    form.chart_show_grid !== (saved.chart_preferences?.show_grid ?? true) ||
    form.chart_show_legend !== (saved.chart_preferences?.show_legend ?? true) ||
    form.chart_color_scheme !== (saved.chart_preferences?.color_scheme ?? 'default')

  const set = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }, [])

  const handleReset = useCallback(() => {
    setForm({
      theme: saved.theme ?? 'dark',
      default_playback_speed: saved.default_playback_speed ?? 1.0,
      explanation_verbosity: saved.explanation_verbosity ?? 'standard',
      animation_detail: saved.animation_detail ?? 'standard',
      chart_show_grid: saved.chart_preferences?.show_grid ?? true,
      chart_show_legend: saved.chart_preferences?.show_legend ?? true,
      chart_color_scheme: saved.chart_preferences?.color_scheme ?? 'default',
    })
    setError(null)
  }, [saved])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        theme: form.theme,
        default_playback_speed: form.default_playback_speed,
        explanation_verbosity: form.explanation_verbosity,
        animation_detail: form.animation_detail,
        chart_preferences: {
          show_grid: form.chart_show_grid,
          show_legend: form.chart_show_legend,
          color_scheme: form.chart_color_scheme,
        },
      }
      const updated = await client.patch('/api/auth/settings', payload)
      setUser(updated)
      toast({ type: 'success', title: 'Settings saved', message: 'Your preferences have been updated.' })
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-enter">
      <PageHeader
        icon={Settings}
        title="Settings"
        description="Configure your simulation defaults and display preferences."
        accent="brand"
        badge="Prefs"
      >
        <Button variant="ghost" size="sm" icon={RotateCcw} onClick={handleReset} disabled={!isDirty || saving}>
          Reset
        </Button>
        <Button variant="primary" size="sm" icon={Save} onClick={handleSave} disabled={!isDirty || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </PageHeader>

      {error && (
        <ErrorAlert
          title={error.title}
          message={error.message}
          fields={error.fields}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appearance */}
        <Card title="Appearance" bodyClassName="p-5 space-y-5">
          <Select
            label="Theme"
            options={THEME_OPTIONS}
            value={form.theme}
            onChange={(e) => set('theme', e.target.value)}
          />
        </Card>

        {/* Simulation Defaults */}
        <Card title="Simulation Defaults" bodyClassName="p-5 space-y-5">
          <Slider
            label="Default Playback Speed"
            min={0.25}
            max={4}
            step={0.25}
            value={form.default_playback_speed}
            onChange={(v) => set('default_playback_speed', v)}
            formatValue={(v) => `${v}×`}
          />

          <Select
            label="Explanation Verbosity"
            options={VERBOSITY_OPTIONS}
            value={form.explanation_verbosity}
            onChange={(e) => set('explanation_verbosity', e.target.value)}
          />

          <Select
            label="Animation Detail"
            options={ANIMATION_OPTIONS}
            value={form.animation_detail}
            onChange={(e) => set('animation_detail', e.target.value)}
          />
        </Card>

        {/* Chart Preferences */}
        <Card title="Chart Preferences" bodyClassName="p-5 space-y-5">
          <ToggleRow
            label="Show grid lines"
            checked={form.chart_show_grid}
            onChange={(v) => set('chart_show_grid', v)}
          />

          <ToggleRow
            label="Show legend"
            checked={form.chart_show_legend}
            onChange={(v) => set('chart_show_legend', v)}
          />

          <Select
            label="Color Scheme"
            options={COLOR_SCHEME_OPTIONS}
            value={form.chart_color_scheme}
            onChange={(e) => set('chart_color_scheme', e.target.value)}
          />
        </Card>
      </div>
    </div>
  )
}


function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-secondary group-hover:text-primary transition-colors">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative w-9 h-5 rounded-full transition-colors duration-200
          ${checked ? 'bg-brand-500' : 'bg-elevated'}
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200
            ${checked ? 'translate-x-4' : 'translate-x-0'}
          `}
        />
      </button>
    </label>
  )
}
