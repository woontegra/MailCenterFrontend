import { useRef, useState } from 'react'
import { Star, Trash2 } from 'lucide-react'

interface SwipeableMailItemProps {
  onStar: () => void
  onDelete: () => void
  onClick: () => void
  children: React.ReactNode
}

export default function SwipeableMailItem({ onStar, onDelete, onClick, children }: SwipeableMailItemProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const startX = useRef(0)
  const currentX = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    setIsSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return
    currentX.current = e.touches[0].clientX
    const diff = currentX.current - startX.current
    setTranslateX(Math.max(-150, Math.min(150, diff)))
  }

  const handleTouchEnd = () => {
    setIsSwiping(false)
    
    if (translateX < -80) {
      onDelete()
    } else if (translateX > 80) {
      onStar()
    }
    
    setTranslateX(0)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background Actions */}
      <div className="absolute inset-0 flex items-center justify-between px-6">
        <div className="flex items-center gap-2 text-yellow-500">
          <Star className="w-5 h-5" />
          <span className="text-sm font-medium">Yıldızla</span>
        </div>
        <div className="flex items-center gap-2 text-red-500">
          <span className="text-sm font-medium">Sil</span>
          <Trash2 className="w-5 h-5" />
        </div>
      </div>

      {/* Mail Item */}
      <div
        className="relative bg-white transition-transform"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={translateX === 0 ? onClick : undefined}
      >
        {children}
      </div>
    </div>
  )
}
