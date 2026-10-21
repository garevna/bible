import { ref } from 'vue'

/**
 * Installing the app on the phone (an icon on the home screen): Android (Chrome) asks by itself with
 * the event kept here; an iPhone has no such event, its steps are shown instead (see InstallDialog).
 */
interface InstallPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** the browser offers to install: the event to ask with, once */
export const installPrompt = ref<InstallPrompt | null>(null)

/** opened from the icon on the home screen: installed already */
export const installed = ref(
  typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
)

/** an iPhone or an iPad: Safari installs by "Share" → "To Home Screen" */
export const isApple = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/**
 * Where the app is installed and how: an iPhone (Safari: "Share"), another phone, a Mac with Safari
 * ("File" → "Add to Dock"), Firefox on a computer (it does not install), another computer (Chrome, Edge)
 */
export type InstallPlace = 'iphone' | 'phone' | 'safari-mac' | 'firefox-desktop' | 'desktop'

export function installPlace(): InstallPlace {
  const agent = navigator.userAgent
  if (isApple()) return 'iphone'
  if (/Android|Mobi/i.test(agent)) return 'phone'
  if (/Firefox\//.test(agent)) return 'firefox-desktop'
  if (/Macintosh/.test(agent) && /Safari\//.test(agent) && !/Chrome|Chromium|Edg\//.test(agent))
    return 'safari-mac'
  return 'desktop'
}

/** a phone or a tablet: the app goes onto its home screen */
export const onPhone = () => ['iphone', 'phone'].includes(installPlace())

export function listenForInstall() {
  window.addEventListener('beforeinstallprompt', (event) => {
    // the app asks when the user wants it, not the browser at once
    event.preventDefault()
    installPrompt.value = event as InstallPrompt
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    installPrompt.value = null
  })
}

/** Android: the window of the browser that installs; true when the user agreed */
export async function install() {
  const event = installPrompt.value
  if (!event) return false
  await event.prompt()
  const { outcome } = await event.userChoice
  installPrompt.value = null
  return outcome === 'accepted'
}
