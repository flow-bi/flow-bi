import type { AppRoute } from '../../../app/routes/routeConfig'

type PlaceholderPageProps = {
  route: AppRoute
}

export function PlaceholderPage({ route }: PlaceholderPageProps) {
  const isDesignOnly = route.status === 'design-only'

  return (
    <section
      className={`min-h-full rounded-lg border p-6 ${
        isDesignOnly
          ? 'border-dashed border-[var(--color-border)] bg-[var(--color-disabled-bg)] text-[var(--color-text-muted)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
      }`}
    >
      <p className="text-xs font-semibold text-[var(--color-primary)]">
        {isDesignOnly ? '디자인만' : route.status === 'partial' ? '일부 실기능' : '실기능'}
      </p>
      <h1 className="mt-2 text-[24px] font-bold">{route.label}</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
        {isDesignOnly
          ? '준비 중입니다. 실제 CRUD/API 연동은 MVP1 범위에 포함하지 않습니다.'
          : route.description}
      </p>
    </section>
  )
}
