// Input injection using @nut-tree/nut-js
// Requires macOS Accessibility permissions
import { mouse, keyboard, Button, Key, Point } from '@nut-tree/nut-js'

export type RemoteInputEvent =
  | { inputType: 'mouse_move'; x: number; y: number }
  | { inputType: 'mouse_click'; x: number; y: number; button: 'left' | 'right' | 'middle' }
  | { inputType: 'mouse_down'; x: number; y: number; button: 'left' | 'right' | 'middle' }
  | { inputType: 'mouse_up'; x: number; y: number; button: 'left' | 'right' | 'middle' }
  | { inputType: 'mouse_scroll'; x: number; y: number; deltaX: number; deltaY: number }
  | { inputType: 'key_down'; key: string; code: string; modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean } }
  | { inputType: 'key_up'; key: string; code: string; modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean } }

// Disable nut.js internal delays for real-time input
mouse.config.autoDelayMs = 0
keyboard.config.autoDelayMs = 0

function getButton(btn: 'left' | 'right' | 'middle'): Button {
  switch (btn) {
    case 'left': return Button.LEFT
    case 'right': return Button.RIGHT
    case 'middle': return Button.MIDDLE
  }
}

// Map JS key codes to nut.js keys
const keyMap: Record<string, Key> = {
  'KeyA': Key.A, 'KeyB': Key.B, 'KeyC': Key.C, 'KeyD': Key.D, 'KeyE': Key.E,
  'KeyF': Key.F, 'KeyG': Key.G, 'KeyH': Key.H, 'KeyI': Key.I, 'KeyJ': Key.J,
  'KeyK': Key.K, 'KeyL': Key.L, 'KeyM': Key.M, 'KeyN': Key.N, 'KeyO': Key.O,
  'KeyP': Key.P, 'KeyQ': Key.Q, 'KeyR': Key.R, 'KeyS': Key.S, 'KeyT': Key.T,
  'KeyU': Key.U, 'KeyV': Key.V, 'KeyW': Key.W, 'KeyX': Key.X, 'KeyY': Key.Y,
  'KeyZ': Key.Z,
  'Digit0': Key.Num0, 'Digit1': Key.Num1, 'Digit2': Key.Num2, 'Digit3': Key.Num3,
  'Digit4': Key.Num4, 'Digit5': Key.Num5, 'Digit6': Key.Num6, 'Digit7': Key.Num7,
  'Digit8': Key.Num8, 'Digit9': Key.Num9,
  'Space': Key.Space, 'Enter': Key.Enter, 'Tab': Key.Tab, 'Escape': Key.Escape,
  'Backspace': Key.Backspace, 'Delete': Key.Delete,
  'ArrowUp': Key.Up, 'ArrowDown': Key.Down, 'ArrowLeft': Key.Left, 'ArrowRight': Key.Right,
  'Home': Key.Home, 'End': Key.End, 'PageUp': Key.PageUp, 'PageDown': Key.PageDown,
  'F1': Key.F1, 'F2': Key.F2, 'F3': Key.F3, 'F4': Key.F4, 'F5': Key.F5, 'F6': Key.F6,
  'F7': Key.F7, 'F8': Key.F8, 'F9': Key.F9, 'F10': Key.F10, 'F11': Key.F11, 'F12': Key.F12,
  'ShiftLeft': Key.LeftShift, 'ShiftRight': Key.RightShift,
  'ControlLeft': Key.LeftControl, 'ControlRight': Key.RightControl,
  'AltLeft': Key.LeftAlt, 'AltRight': Key.RightAlt,
  'MetaLeft': Key.LeftCmd, 'MetaRight': Key.RightCmd,
  'Minus': Key.Minus, 'Equal': Key.Equal,
  'BracketLeft': Key.LeftBracket, 'BracketRight': Key.RightBracket,
  'Backslash': Key.Backslash, 'Semicolon': Key.Semicolon,
  'Quote': Key.Quote, 'Comma': Key.Comma, 'Period': Key.Period, 'Slash': Key.Slash,
  'Backquote': Key.Grave
}

function getKey(code: string): Key | undefined {
  return keyMap[code]
}

let lastInputTime = 0
const INPUT_THROTTLE_MS = 10 // 100 inputs/sec max

export async function injectInput(event: RemoteInputEvent): Promise<void> {
  // Rate limiting
  const now = Date.now()
  if (now - lastInputTime < INPUT_THROTTLE_MS) return
  lastInputTime = now

  try {
    switch (event.inputType) {
      case 'mouse_move':
        await mouse.setPosition(new Point(event.x, event.y))
        break

      case 'mouse_click':
        await mouse.setPosition(new Point(event.x, event.y))
        await mouse.click(getButton(event.button))
        break

      case 'mouse_down':
        await mouse.setPosition(new Point(event.x, event.y))
        await mouse.pressButton(getButton(event.button))
        break

      case 'mouse_up':
        await mouse.setPosition(new Point(event.x, event.y))
        await mouse.releaseButton(getButton(event.button))
        break

      case 'mouse_scroll':
        await mouse.setPosition(new Point(event.x, event.y))
        if (event.deltaY !== 0) {
          await mouse.scrollDown(Math.round(event.deltaY / 10))
        }
        break

      case 'key_down': {
        const key = getKey(event.code)
        if (key) {
          await keyboard.pressKey(key)
        }
        break
      }

      case 'key_up': {
        const key = getKey(event.code)
        if (key) {
          await keyboard.releaseKey(key)
        }
        break
      }
    }
  } catch (err) {
    console.error('Input injection error:', err)
  }
}
