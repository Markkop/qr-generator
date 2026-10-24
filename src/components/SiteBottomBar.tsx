import { useI18n } from '../i18n/context'

export function SiteBottomBar() {
  const { t } = useI18n()
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-x-6 border-t border-zinc-200 bg-soft px-[max(1rem,env(safe-area-inset-left,0px))] pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] text-center font-[ui-rounded,system-ui,sans-serif] text-sm leading-5 font-semibold text-zinc-800 antialiased dark:border-zinc-800 dark:text-zinc-100">
      <a
        href="https://markkop.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-1.5 transition-colors hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 motion-reduce:transition-none dark:hover:text-indigo-400"
      >
        <span>{t('footer.madeWith')}</span>
        <svg
          className="h-5 w-6 shrink-0 text-red-500"
          viewBox="0 0 12 10"
          aria-hidden="true"
          shapeRendering="crispEdges"
        >
          <path fill="#141b1b" d="M2 0h3v1h2V0h3v1h1v1h1v3h-1v1h-1v1H9v1H8v1H7v1H5V9H4V8H3V7H2V6H1V5H0V2h1V1h1Z" />
          <path fill="currentColor" d="M2 1h3v1h2V1h3v1h1v3h-1v1H9v1H8v1H7v1H5V8H4V7H3V6H2V5H1V2h1Z" />
          <path fill="#f8f2e8" opacity="0.7" d="M2 2h2v1H2Z" />
        </svg>
        <span className="sr-only">{t('footer.love')}</span>
        <span>
          {t('footer.by')} <strong className="font-extrabold text-indigo-600 dark:text-indigo-400">Mark Kop</strong>
        </span>
      </a>
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">© 2026</span>
      <nav aria-label={t('footer.navigation')} className="flex flex-wrap items-center justify-center gap-x-4">
        <a
          href="https://github.com/Markkop/qr-generator"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-zinc-500 underline-offset-4 hover:text-indigo-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400"
        >
          {t('footer.source')}
        </a>
      </nav>
    </div>
  )
}
