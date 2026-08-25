import { describe, expect, it } from 'vitest'

type Boundary = 'api' | 'calendar' | 'hooks' | 'model' | 'root' | 'schedule' | 'outside'

const rootSources = import.meta.glob('./*.*', {
  eager: true,
  import: 'default',
  query: '?raw',
})
const featureSources = import.meta.glob('./**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
})
const appSources = import.meta.glob('../../App.tsx', {
  eager: true,
  import: 'default',
  query: '?raw',
})

const allowedRootFiles = new Set([
  './ScheduleCalendar.test.tsx',
  './ScheduleCalendar.tsx',
  './index.ts',
])

const boundaryFor = (path: string): Boundary => {
  if (path.startsWith('./api/')) {
    return 'api'
  }
  if (path.startsWith('./model/')) {
    return 'model'
  }
  if (path.startsWith('./hooks/')) {
    return 'hooks'
  }
  if (path.startsWith('./components/calendar/')) {
    return 'calendar'
  }
  if (path.startsWith('./components/schedule/')) {
    return 'schedule'
  }
  if (/^\.\/(?:ScheduleCalendar|featureBoundary|index)(?:\.|$)/.test(path)) {
    return 'root'
  }
  return 'outside'
}

const resolveImport = (sourcePath: string, specifier: string) => {
  const segments = `${sourcePath.slice(0, sourcePath.lastIndexOf('/'))}/${specifier}`.split('/')
  const resolved: string[] = []
  for (const segment of segments) {
    if (!segment || segment === '.') {
      continue
    }
    if (segment === '..') {
      resolved.pop()
    } else {
      resolved.push(segment)
    }
  }
  return `./${resolved.join('/')}`
}

const featureImports = (sourcePath: string, source: string) =>
  [...source.matchAll(/from ['"](\.[^'"]+)['"]/g)]
    .map((match) => resolveImport(sourcePath, match[1]))
    .filter((path) => path.startsWith('./'))

describe('schedule calendar feature boundary', () => {
  it('keeps only the public entry point and top-level composition at the feature root', () => {
    expect(Object.keys(rootSources).sort()).toEqual([...allowedRootFiles].sort())
  })

  it('keeps external consumers on the public entry point', () => {
    const appSource = appSources['../../App.tsx']
    expect(appSource).toMatch(/from ['"]\.\/features\/schedule-calendar['"]/)
  })

  it('keeps dependencies directed from composition to boundaries without cycles', () => {
    const allowedDependencies = {
      api: new Set(['api', 'outside']),
      model: new Set(['api', 'model', 'outside']),
      hooks: new Set(['api', 'hooks', 'model', 'outside']),
      calendar: new Set(['api', 'calendar', 'model', 'outside']),
      schedule: new Set(['api', 'model', 'schedule', 'outside']),
      root: new Set(['api', 'calendar', 'hooks', 'model', 'schedule', 'root', 'outside']),
    }

    for (const [path, source] of Object.entries(featureSources)) {
      if (path.endsWith('.test.ts') || path.endsWith('.test.tsx')) {
        continue
      }
      const sourceBoundary = boundaryFor(path)
      if (sourceBoundary === 'outside') {
        continue
      }
      for (const importedPath of featureImports(path, source)) {
        const importedBoundary = boundaryFor(importedPath)
        expect(allowedDependencies[sourceBoundary]).toContain(importedBoundary)
      }
    }
  })
})
