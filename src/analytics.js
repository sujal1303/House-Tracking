const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID

const hasWindow = typeof window !== 'undefined'
const isEnabled = Boolean(measurementId && hasWindow)

export const initAnalytics = () => {
  if (!isEnabled) return
  if (window.__houseTrackingGaInitialized) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag(...args) {
    window.dataLayer.push(args)
  }

  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false })
  window.__houseTrackingGaInitialized = true
}

export const trackPageView = (path) => {
  if (!isEnabled || !window.gtag) return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}

export const trackEvent = (eventName, params = {}) => {
  if (!isEnabled || !window.gtag) return
  window.gtag('event', eventName, params)
}
