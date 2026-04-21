import { Plus } from 'lucide-react'

interface FloatingActionButtonProps {
  onClick: () => void
  icon?: React.ReactNode
  label?: string
}

export default function FloatingActionButton({ onClick, icon, label }: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 active:scale-95 transition-all flex items-center justify-center"
      aria-label={label || 'Action'}
    >
      {icon || <Plus className="w-6 h-6" />}
    </button>
  )
}
