import { Tldraw, createShapeId, iconTypes, toRichText, type Editor, type TLShapePartial } from 'tldraw'
import 'tldraw/tldraw.css'

// Self-host the icon sprite to avoid cross-origin SVG fragment blocking
const localAssetUrls = {
  icons: Object.fromEntries(
    iconTypes.map((name) => [name, `/tldraw/0_merged.svg#${name}`])
  ),
}

// ── layout constants ────────────────────────────────────────────
const W = 186   // box width
const H = 60    // box height
const P = 226   // step pitch (box width + 40px gap)
const MID = H / 2

// Lane y-tops
const L1 = 60    // Customer booking UI
const L2 = 220   // Manual payment path
const L3 = 410   // Auto-confirm path
const L4 = 600   // Check-in flow
const L5 = 790   // Admin flow

// L2 starts aligned under L1 "Confirm & Pay" (step index 5)
const L2_X = 5 * P

// ── shape builders ──────────────────────────────────────────────
function box(
  id: string, x: number, y: number, text: string, color: string, w = W
): TLShapePartial {
  return {
    id: createShapeId(id),
    type: 'geo',
    x, y,
    props: {
      geo: 'rectangle',
      w, h: H,
      richText: toRichText(text),
      fill: 'solid',
      color,
      size: 's',
      align: 'middle',
      verticalAlign: 'middle',
      font: 'sans',
    },
  } as TLShapePartial
}

function pill(id: string, x: number, y: number, text: string): TLShapePartial {
  return {
    id: createShapeId(id),
    type: 'geo',
    x, y,
    props: {
      geo: 'rectangle',
      w: 140, h: H,
      richText: toRichText(text),
      fill: 'semi',
      color: 'grey',
      size: 's',
      align: 'middle',
      verticalAlign: 'middle',
      font: 'sans',
    },
  } as TLShapePartial
}

function arrowH(id: string, fromX: number, laneY: number): TLShapePartial {
  return {
    id: createShapeId(id),
    type: 'arrow',
    x: fromX + W,
    y: laneY + MID,
    props: {
      kind: 'arc',
      start: { x: 0, y: 0 },
      end: { x: P - W, y: 0 },
      bend: 0,
      color: 'grey',
      size: 's',
      arrowheadStart: 'none',
      arrowheadEnd: 'arrow',
    },
  } as TLShapePartial
}

function arrowV(id: string, x: number, fromY: number, toY: number): TLShapePartial {
  return {
    id: createShapeId(id),
    type: 'arrow',
    x: x + W / 2,
    y: fromY + H,
    props: {
      kind: 'arc',
      start: { x: 0, y: 0 },
      end: { x: 0, y: toY - fromY - H },
      bend: 0,
      color: 'grey',
      size: 's',
      arrowheadStart: 'none',
      arrowheadEnd: 'arrow',
    },
  } as TLShapePartial
}

// ── diagram builder ─────────────────────────────────────────────
function buildShapes(): TLShapePartial[] {
  const s: TLShapePartial[] = []

  // Lane labels (left column)
  s.push(box('lbl1', -160, L1, 'CUSTOMER\nBOOKING UI', 'green', 140))
  s.push(box('lbl2', -160, L2, 'MANUAL\nPAYMENT', 'blue', 140))
  s.push(box('lbl3', -160, L3, 'AUTO-CONFIRM\nPATH', 'orange', 140))
  s.push(box('lbl4', -160, L4, 'CHECK-IN\nFLOW', 'violet', 140))
  s.push(box('lbl5', -160, L5, 'ADMIN\nFLOW', 'red', 140))

  // ── L1: Customer booking UI ────────────────────────────────────
  const l1 = [
    '/booking',
    'Pick a Date',
    'Tap-Tap Grid\n● anchor → ✓ end',
    'Fill Details\nname · phone · email',
    'Player Names\nYOU + optional slots',
    'Confirm & Pay\n(BookingModal)',
    'LOCKED ⏱\n15-min window',
  ]
  l1.forEach((text, i) => {
    s.push(box(`l1_${i}`, i * P, L1, text, 'green'))
    if (i > 0) s.push(arrowH(`la1_${i}`, (i - 1) * P, L1))
  })

  // ── L2: Manual payment path ────────────────────────────────────
  // Starts at x=L2_X, aligned directly below L1 "Confirm & Pay" (step 5)
  const l2 = [
    'Enter payment\nreference',
    'confirm-booking\nAPI',
    'booking_players\ncreated',
    'Email ✉ + QR\nper player',
    'CONFIRMED ✓',
  ]
  l2.forEach((text, i) => {
    s.push(box(`l2_${i}`, L2_X + i * P, L2, text, 'blue'))
    if (i > 0) s.push(arrowH(`la2_${i}`, L2_X + (i - 1) * P, L2))
  })
  // Vertical connector: L1 "Confirm & Pay" → L2 "Enter payment ref"
  s.push(arrowV('v_l1_l2', L2_X, L1, L2))

  // ── L3: Auto-confirm path ──────────────────────────────────────
  const l3 = [
    'GCash / Maya /\nGoTyme notif.',
    'payment-confirmed\nAPI',
    'Amount match\n±₱5 tolerance',
    'booking_players\ncreated',
    'Email ✉ + QR\nper player',
    'CONFIRMED ✓',
  ]
  l3.forEach((text, i) => {
    s.push(box(`l3_${i}`, i * P, L3, text, 'orange'))
    if (i > 0) s.push(arrowH(`la3_${i}`, (i - 1) * P, L3))
  })

  // ── L4: Check-in flow ──────────────────────────────────────────
  const l4 = [
    'Open email',
    'Scan QR code',
    '/checkin/[token]',
    'Validate window\n30 min before → end',
    'Welcome [Name] 🎾',
  ]
  l4.forEach((text, i) => {
    s.push(box(`l4_${i}`, i * P, L4, text, 'violet'))
    if (i > 0) s.push(arrowH(`la4_${i}`, (i - 1) * P, L4))
  })

  // ── L5: Admin flow ─────────────────────────────────────────────
  const l5 = [
    '/admin\ndashboard',
    'Pending /\nConfirmed tabs',
    '/admin/booking\n/[ref]',
    'Player list +\ncheck-in status',
    'Manual tap\nCheck-in ✓',
  ]
  l5.forEach((text, i) => {
    s.push(box(`l5_${i}`, i * P, L5, text, 'red'))
    if (i > 0) s.push(arrowH(`la5_${i}`, (i - 1) * P, L5))
  })

  // ── Cross-lane annotations ─────────────────────────────────────
  // "OR" badge between L2 and L3 on the left
  s.push(pill('or_badge', -160, L2 + H + (L3 - L2 - H) / 2 - 18, 'OR ↕\nboth paths →\nEmail + QR'))

  return s
}

// ── component ───────────────────────────────────────────────────
export default function FlowCanvas() {
  function handleMount(editor: Editor) {
    const shapes = buildShapes()
    editor.createShapes(shapes)
    editor.selectAll()
    editor.zoomToFit({ animation: { duration: 0 } })
    editor.selectNone()
  }

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw onMount={handleMount} assetUrls={localAssetUrls} />
    </div>
  )
}
