import { useState } from 'react'

import { Header } from './Header'
import { Sidebar } from './Sidebar'

import type { PropsWithChildren } from 'react'

type AppLayoutProps = PropsWithChildren<{
  activePath: string
}>

export function AppLayout({ activePath, children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Header onOpenSidebar={() => setIsSidebarOpen(true)} />

      <div className="flex h-[calc(100vh-56px)]">
        <div className="hidden md:block">
          <Sidebar activePath={activePath} />
        </div>

        {isSidebarOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              className="absolute inset-0 h-full w-full bg-black/20"
              type="button"
              aria-label="사이드바 닫기"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="relative h-full">
              <Sidebar activePath={activePath} onNavigate={() => setIsSidebarOpen(false)} />
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 overflow-auto p-5 md:p-6">{children}</main>
      </div>
    </div>
  )
}
