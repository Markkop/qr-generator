// Runs before first paint so dark mode does not flash. Kept external so the CSP needs no inline scripts.
try {
  var theme = JSON.parse(localStorage.getItem('qr-generator:prefs') || '{}').theme
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#09090b')
  }
  if (localStorage.getItem('qr-generator:locale') === 'en') document.documentElement.lang = 'en'
} catch {}
