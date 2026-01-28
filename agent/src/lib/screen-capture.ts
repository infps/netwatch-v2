// Screen capture using Electron's desktopCapturer
import { desktopCapturer, systemPreferences, screen } from 'electron'

export type ScreenSource = {
  id: string
  name: string
  thumbnailDataUrl: string
}

export async function getScreenSources(): Promise<ScreenSource[]> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 }
    })

    // If no sources returned, likely permission issue
    if (sources.length === 0 && process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus('screen')
      console.error('[Screen] No sources returned. Permission status:', status)
    }

    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnailDataUrl: source.thumbnail.toDataURL()
    }))
  } catch (err) {
    console.error('[Screen] Failed to get sources:', err)
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus('screen')
      console.error('[Screen] Permission status:', status)
    }
    return []
  }
}

export function getPrimaryDisplayBounds() {
  const primaryDisplay = screen.getPrimaryDisplay()
  return primaryDisplay.bounds
}

export function checkScreenCapturePermission(): boolean {
  // macOS requires screen recording permission
  if (process.platform === 'darwin') {
    return systemPreferences.getMediaAccessStatus('screen') === 'granted'
  }
  return true
}

export function requestScreenCapturePermission(): boolean {
  // On macOS, we can't programmatically request screen recording permission
  // The system will prompt when getDisplayMedia is called
  // This just checks and returns current status
  return checkScreenCapturePermission()
}
