export function navigateTo(path: string, options: { replace?: boolean } = {}) {
  if (options.replace) {
    window.history.replaceState({}, '', path)
  } else {
    window.history.pushState({}, '', path)
  }

  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function getCurrentPath() {
  return `${window.location.pathname}${window.location.search}`
}
