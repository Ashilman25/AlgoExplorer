import { useState } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import { Copy, Check } from 'lucide-react'
import { cn } from '../../utils/cn'

const LANGUAGES = [
  { key: 'python',     label: 'PY',   prismLang: 'python' },
  { key: 'javascript', label: 'JS',   prismLang: 'javascript' },
  { key: 'java',       label: 'Java', prismLang: 'java' },
  { key: 'cpp',        label: 'C++',  prismLang: 'cpp' },
]

const algoTheme = {
  plain: {
    color: '#cbd5e1',
    backgroundColor: 'transparent',
  },
  styles: [
    { types: ['keyword', 'builtin'],   style: { color: '#22d3ee' } },
    { types: ['string', 'char'],       style: { color: '#34d399' } },
    { types: ['number', 'boolean'],    style: { color: '#fbbf24' } },
    { types: ['comment'],              style: { color: '#64748b', fontStyle: 'italic' } },
    { types: ['function', 'method'],   style: { color: '#a78bfa' } },
    { types: ['operator', 'punctuation'], style: { color: '#94a3b8' } },
    { types: ['class-name', 'type-name'], style: { color: '#38bdf8' } },
  ],
}

export default function CodeView({ code }) {
  const [langKey, setLangKey] = useState('python')
  const [copied, setCopied] = useState(false)

  if (!code) {
    return (
      <div className = "flex-1 flex items-center justify-center text-slate-500 text-xs">
        No code available
      </div>
    )
  }

  const activeLang = LANGUAGES.find((l) => l.key === langKey) || LANGUAGES[0]
  const codeText = code[langKey] || ''

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className = "flex flex-col flex-1 min-h-0">
      <div className = "flex items-center justify-between px-3 pt-2 pb-1">
        <div className = "flex items-center gap-1">
          {LANGUAGES.map((lang) => (
            <button
              key = {lang.key}
              aria-label = {lang.label}
              onClick = {() => setLangKey(lang.key)}
              className = {cn(
                'px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors duration-150',
                langKey === lang.key
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent',
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <button
          onClick = {handleCopy}
          aria-label = "Copy code"
          className = "p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors duration-150"
        >
          {copied ? <Check size = {13} /> : <Copy size = {13} />}
        </button>
      </div>

      <div className = "flex-1 overflow-y-auto min-h-0 px-3 pb-3">
        <Highlight theme = {algoTheme} code = {codeText} language = {activeLang.prismLang}>
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre className = "font-mono text-[13px] leading-6 m-0">
              {tokens.map((line, i) => (
                <div key = {i} {...getLineProps({ line })}>
                  <span className = "inline-block w-8 text-right pr-3 text-slate-600 select-none text-[12px]">
                    {i + 1}
                  </span>
                  {line.map((token, key) => (
                    <span key = {key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  )
}
