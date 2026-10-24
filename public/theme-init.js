// Runs before first paint so dark mode does not flash. Kept external so the CSP needs no inline scripts.
try {
  var theme = JSON.parse(localStorage.getItem('qr-generator:prefs') || '{}').theme || 'system'
  if (theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
  }
  if (localStorage.getItem('qr-generator:locale') === 'en') document.documentElement.lang = 'en'
} catch {}
