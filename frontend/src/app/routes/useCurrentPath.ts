import { useEffect, useState } from 'react'

import { getCurrentPath } from './navigation'

export function useCurrentPath() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath)

  useEffect(() => {
    const handleChange = () => {
      setCurrentPath(getCurrentPath())
    }

    window.addEventListener('popstate', handleChange)
    return () => {
      window.removeEventListener('popstate', handleChange)
    }
  }, [])

  return currentPath
}
