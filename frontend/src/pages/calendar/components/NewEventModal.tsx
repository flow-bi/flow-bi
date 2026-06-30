import { X } from 'lucide-react'

import { BRAND_PRIMARY } from '@/constants/brand'

interface NewEventModalProps {
  onClose: () => void
}

export function NewEventModal({ onClose }: NewEventModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h3 className="font-bold text-base text-foreground">새 일정 등록</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">제목</label>
            <input
              type="text"
              placeholder="일정 제목 입력"
              className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1.5">시작</label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">종료</label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">대상</label>
            <select className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:outline-none bg-white">
              <option>개인 일정</option>
              <option>조직 일정</option>
              <option>전사 일정</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            취소
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
