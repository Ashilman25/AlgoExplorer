import { useState, useCallback, useRef } from 'react'

export function useDrag({ defaultPosition = { x: 0, y: 0 } } = {}) {
  const [position, setPosition] = useState(defaultPosition)
  const [isDragging, setIsDragging] = useState(false)
  const posRef = useRef(defaultPosition)

  const handlePointerDown = useCallback((e) => {
    if (e.target.closest('button, input, select, textarea, a')) return

    e.preventDefault()
    setIsDragging(true)

    const startX = e.clientX
    const startY = e.clientY
    const originX = posRef.current.x
    const originY = posRef.current.y

    const onMove = (moveEvent) => {
      const next = {
        x: originX + (moveEvent.clientX - startX),
        y: originY + (moveEvent.clientY - startY),
      }
      posRef.current = next
      setPosition(next)
    }

    const onUp = () => {
      setIsDragging(false)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [])

  return { position, isDragging, handlePointerDown }
}
