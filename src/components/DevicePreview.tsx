import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  ArrowRight,
  BatteryFull,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Ellipsis,
  Globe,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Pause,
  Phone,
  Play,
  Plus,
  RotateCcw,
  Send,
  Share,
  Signal,
  Smartphone,
  SwitchCamera,
  UserRound,
  Wifi,
  ZapOff,
  type LucideIcon,
} from 'lucide-react'
import qrcode from 'qrcode-generator'
import { useI18n } from '../i18n/context'
import { cx } from '../lib/cx'
import { createDemoExample, DEMO_OS_KEY, readDemoOS, type DemoExample, type DemoOS } from '../lib/device-preview'
import { typeLabelKey, type ContentType } from '../lib/payload/types'
import { toByteString } from '../lib/qr/encode'
import './DevicePreview.css'

type Phase = 'aim' | 'detect' | 'tap' | 'open'
const NEXT_PHASE: Record<Phase, Phase> = { aim: 'detect', detect: 'tap', tap: 'open', open: 'aim' }
const DURATION: Record<Phase, number> = { aim: 2200, detect: 1700, tap: 900, open: 3600 }
const ICONS: Record<ContentType, LucideIcon> = {
  url: Globe,
  text: Copy,
  wifi: Wifi,
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  sms: MessageCircle,
  contact: UserRound,
  location: MapPin,
}

const reducedQuery = '(prefers-reduced-motion: reduce)'
const readReducedMotion = () => window.matchMedia(reducedQuery).matches
function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(reducedQuery)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function ExampleQr({ payload }: { payload: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(toByteString(payload), 'Byte')
    qr.make()
    const size = qr.getModuleCount()
    const modules: string[] = []
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (qr.isDark(row, col)) modules.push(`M${col + 4},${row + 4}h1v1h-1z`)
      }
    }
    return { size: size + 8, path: modules.join('') }
  }, [payload])
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="demo-example-qr" shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#18181b" />
    </svg>
  )
}

function ResultScreen({ type, os, example }: { type: ContentType; os: DemoOS; example: DemoExample }) {
  const { t } = useI18n()
  const Icon = ICONS[type]
  const app = t(`demo.app.${type}.${os}`)

  return (
    <div className={`demo-result demo-result-${type}`} data-testid="demo-result" data-app={app}>
      <div className="demo-app-bar">
        <ChevronLeft />
        <span>{app}</span>
        {type === 'url' ? <Ellipsis /> : <span className="demo-done">{t('demo.done')}</span>}
      </div>

      {type === 'url' ? (
        <>
          <div className="demo-address">
            <LockKeyhole />
            <span>markkop.dev</span>
            {os === 'ios' ? <span>ᴀA</span> : <Ellipsis />}
          </div>
          <div className="demo-web-page">
            <div className="demo-web-brand">
              markkop.dev<span>↗</span>
            </div>
            <div className="demo-web-art">
              <span />
              <span />
              <span />
              <span />
            </div>
            <small>{t('demo.website.eyebrow')}</small>
            <h3>{t('demo.website.title')}</h3>
            <p>{t('demo.website.body')}</p>
            <div className="demo-web-link">
              {t('demo.website.action')}
              <ArrowRight />
            </div>
          </div>
          <div className="demo-browser-toolbar">
            <ChevronLeft />
            <ChevronRight />
            <Share />
            <BookOpen />
            <Copy />
          </div>
        </>
      ) : type === 'wifi' ? (
        <>
          <div className="demo-settings-heading">
            Wi-Fi
            <span className="demo-native-switch" />
          </div>
          <div className="demo-network-row">
            <Wifi />
            <span>
              Studio Wi-Fi<small>{t('demo.secured')}</small>
            </span>
            <LockKeyhole />
          </div>
          <div className="demo-modal-shade" />
          <div className="demo-native-dialog">
            <div className="demo-result-icon">
              <Wifi />
            </div>
            <h3>{t('demo.join.title')}</h3>
            <p>{t('demo.join.body')}</p>
            <div className="demo-dialog-actions">
              <span>{t('demo.cancel')}</span>
              <strong>{t('demo.join.action')}</strong>
            </div>
          </div>
        </>
      ) : type === 'phone' ? (
        <div className="demo-dialer">
          <p>+1 (202) 555-0123</p>
          <small>{t('demo.phone.ready')}</small>
          <div className="demo-keypad">
            {'123456789*0#'.split('').map((digit) => (
              <span key={digit}>{digit}</span>
            ))}
          </div>
          <span className="demo-call">
            <Phone />
          </span>
        </div>
      ) : type === 'whatsapp' ? (
        <div className="demo-messages">
          <div className="demo-recipient">
            <small>WhatsApp</small>
            <span>+55 11 91234 5678</span>
          </div>
          <p className="demo-draft-label">{t('demo.draft')}</p>
          <div className="demo-composer">
            <Plus />
            <span>{example.fields.whatsapp.message}</span>
            <span className="demo-send">
              <ArrowRight />
            </span>
          </div>
        </div>
      ) : type === 'sms' ? (
        <div className="demo-messages">
          <div className="demo-recipient">
            <small>{t('demo.to')}</small>
            <span>+1 (202) 555-0123</span>
          </div>
          <p className="demo-draft-label">{t('demo.draft')}</p>
          <div className="demo-composer">
            <Plus />
            <span>{example.fields.sms.message}</span>
            <span className="demo-send">
              <ArrowRight />
            </span>
          </div>
          <div className="demo-keyboard">
            {'qwertyuiopasdfghjklzxcvbnm'.split('').map((key) => (
              <span key={key}>{key}</span>
            ))}
            <span className="demo-space" />
          </div>
        </div>
      ) : type === 'email' ? (
        <div className="demo-mail">
          <h3>{t('demo.compose')}</h3>
          <div>
            <small>{t('demo.to')}</small>
            <span>{example.fields.email.to}</span>
          </div>
          <div>
            <small>{t('demo.subject')}</small>
            <span>{example.fields.email.subject}</span>
          </div>
          <p>{example.fields.email.body}</p>
          <span className="demo-mail-send">
            <Send />
            {t('demo.draft')}
          </span>
        </div>
      ) : type === 'contact' ? (
        <div className="demo-contact">
          <div className="demo-avatar">AS</div>
          <h3>Ana Silva</h3>
          <p>Studio</p>
          <div className="demo-contact-actions">
            <span>
              <Phone />
            </span>
            <span>
              <MessageCircle />
            </span>
            <span>
              <Mail />
            </span>
          </div>
          <div className="demo-contact-detail">
            <small>{t('demo.mobile')}</small>+1 (202) 555-0123
          </div>
          <div className="demo-contact-detail">
            <small>{t('type.email')}</small>ana@example.com
          </div>
          <div className="demo-native-action">{t(os === 'ios' ? 'demo.contact.create' : 'demo.contact.save')}</div>
        </div>
      ) : type === 'location' ? (
        <>
          <div className="demo-map">
            <div className="demo-map-park" />
            <div className="demo-map-river" />
            <div className="demo-map-road" />
            <div className="demo-map-pin">
              <MapPin />
            </div>
            <span>São Paulo</span>
          </div>
          <div className="demo-map-sheet">
            <small>{t('demo.location.pin')}</small>
            <h3>São Paulo</h3>
            <p>23.5505° S, 46.6333° W</p>
            <div className="demo-native-action">
              <Navigation />
              {t('demo.location.directions')}
            </div>
          </div>
        </>
      ) : (
        <div className="demo-text-result">
          <div className="demo-result-icon">
            <Icon />
          </div>
          <small>{t('demo.text.found')}</small>
          <p>{example.fields.text.text}</p>
          <div className="demo-native-action">
            <Copy />
            {t('demo.text.copy')}
          </div>
        </div>
      )}
    </div>
  )
}

export function DevicePreview({ type }: { type: ContentType }) {
  const [os, setOS] = useState<DemoOS>(readDemoOS)
  const selectOS = (next: DemoOS) => {
    setOS(next)
    try {
      localStorage.setItem(DEMO_OS_KEY, next)
    } catch {
      // The selection still works without persistent browser storage.
    }
  }
  return <DevicePreviewScene key={`${os}-${type}`} type={type} os={os} onOSChange={selectOS} />
}

function DevicePreviewScene({
  type,
  os,
  onOSChange,
}: {
  type: ContentType
  os: DemoOS
  onOSChange: (os: DemoOS) => void
}) {
  const { t } = useI18n()
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => true)
  const [motionPhase, setPhase] = useState<Phase>('aim')
  const [staticPhase, setStaticPhase] = useState<Phase>('open')
  const phase = reducedMotion ? staticPhase : motionPhase
  const [paused, setPaused] = useState(false)
  const [replay, setReplay] = useState(0)
  const example = useMemo(() => createDemoExample(type, t), [type, t])
  const Icon = ICONS[type]
  const currentStep = phase === 'aim' ? 'aim' : phase === 'open' ? 'open' : 'detect'

  useEffect(() => {
    if (paused || reducedMotion) return
    const timer = window.setTimeout(() => setPhase(NEXT_PHASE[phase]), DURATION[phase])
    return () => window.clearTimeout(timer)
  }, [phase, paused, reducedMotion, os, type, replay])

  return (
    <section
      className="device-demo"
      aria-label={t('demo.label')}
      data-testid="device-demo"
      data-os={os}
      data-type={type}
      data-phase={phase}
      data-paused={paused || reducedMotion}
    >
      <div className="demo-heading">
        <span>
          <Smartphone />
          {t('demo.title')}
        </span>
        <div className="demo-os-toggle" role="group" aria-label={t('demo.os')}>
          {(['android', 'ios'] as const).map((value) => (
            <button type="button" key={value} aria-pressed={os === value} onClick={() => onOSChange(value)}>
              {value === 'ios' ? 'iOS' : 'Android'}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cx('demo-stage', `demo-${os}`, `demo-phase-${phase}`, paused && 'demo-paused')}
        key={`${os}-${type}-${replay}`}
      >
        <div className="demo-ambient-orbit" aria-hidden="true" />
        <div
          className="demo-phone"
          role="img"
          aria-label={t('demo.description', {
            os: os === 'ios' ? 'iOS' : 'Android',
            type: t(typeLabelKey(type)),
            action: t(`demo.result.${type}`),
          })}
        >
          <div className="demo-phone-screen" aria-hidden="true">
            <div className="demo-phone-status">
              <span>9:41</span>
              <span>
                <Signal />
                <Wifi />
                <BatteryFull />
              </span>
            </div>
            <div className="demo-camera-cutout" />
            <div className="demo-camera-ui">
              <div className="demo-camera-top">
                <ZapOff />
                <ChevronDown />
                <span>HD</span>
              </div>
              <div className="demo-viewfinder">
                <div className="demo-desk">
                  <div className="demo-desk-leaf" />
                  <div className="demo-desk-cup" />
                </div>
                <div className="demo-qr-card">
                  <ExampleQr payload={example.payload} />
                  <span>{t(typeLabelKey(type))}</span>
                </div>
                <div className="demo-focus-brackets">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <span className="demo-zoom">1×</span>
              </div>
              <div className="demo-scan-suggestion">
                <Icon />
                <span>
                  <small>{t(`demo.scan.${type}`)}</small>
                  <strong>{example.title}</strong>
                </span>
                <ChevronRight />
              </div>
              <div className="demo-tap-indicator" />
              <div className="demo-camera-modes">
                <span>{t('demo.camera.video')}</span>
                <strong>{t('demo.camera.photo')}</strong>
                <span>{t('demo.camera.portrait')}</span>
              </div>
              <div className="demo-camera-controls">
                <span className="demo-gallery" />
                <span className="demo-shutter" />
                <SwitchCamera />
              </div>
            </div>
            <ResultScreen type={type} os={os} example={example} />
            <div className="demo-home-indicator" />
          </div>
        </div>
      </div>

      <div className="demo-caption">
        <div>
          <span className="demo-caption-eyebrow">
            {t(typeLabelKey(type))} · {os === 'ios' ? 'iOS' : 'Android'}
          </span>
          <p>{t(phase === 'open' ? `demo.result.${type}` : `demo.phase.${phase}`)}</p>
        </div>
        <div className="demo-playback">
          {!reducedMotion && (
            <button
              type="button"
              aria-label={t(paused ? 'demo.play' : 'demo.pause')}
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play /> : <Pause />}
            </button>
          )}
          <button
            type="button"
            aria-label={t('demo.replay')}
            onClick={() => {
              setPhase('aim')
              setStaticPhase('aim')
              setReplay((v) => v + 1)
              setPaused(reducedMotion)
            }}
          >
            <RotateCcw />
          </button>
        </div>
      </div>
      <div className="demo-steps" role="group" aria-label={t('demo.steps')}>
        {(['aim', 'detect', 'open'] as const).map((step, index) => (
          <button
            type="button"
            key={step}
            aria-current={currentStep === step ? 'step' : undefined}
            onClick={() => {
              setPaused(true)
              setPhase(step)
              setStaticPhase(step)
            }}
          >
            <span>{currentStep === step && step === 'open' ? <Check /> : index + 1}</span>
            {t(`demo.step.${step}`)}
          </button>
        ))}
      </div>
      <p className="demo-disclaimer">{t('demo.disclaimer')}</p>
    </section>
  )
}
