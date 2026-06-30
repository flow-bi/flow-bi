import { BRAND_PRIMARY } from '@/constants/brand'

interface BookingModalActionsProps {
  onClose: () => void
  onSubmit: () => void
}

export function BookingModalActions({ onClose, onSubmit }: BookingModalActionsProps) {
  return (
    <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
      >
        취소
      </button>
      <button
        onClick={onSubmit}
        className="px-4 py-2 rounded-lg text-sm font-bold text-white"
        style={{ backgroundColor: BRAND_PRIMARY }}
      >
        예약 확정
      </button>
    </div>
  )
}
