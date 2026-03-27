import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { initAnalytics } from './analytics.js'

initAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
     
<script async src="https://www.googletagmanager.com/gtag/js?id=G-MMRTNNP9XR"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments)}
  gtag('js', new Date());

  gtag('config', 'G-MMRTNNP9XR');
</script>
    </BrowserRouter>
  </StrictMode>,
)
