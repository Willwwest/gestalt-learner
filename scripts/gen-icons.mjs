// Generates the PWA icon set as PNGs with no image-library dependency.
// Draws a speech bubble on a gradient rounded square, encoded by hand
// (raw RGBA scanlines -> zlib -> PNG chunks).
// Run: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(projectRoot, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// ---------- PNG encoding ----------
const crcTable = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c
}
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- drawing helpers (signed distance fields, 1px antialiasing) ----------
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const coverage = (dist) => clamp01(0.5 - dist) // dist in px; <=-0.5 full, >=0.5 empty
function sdRoundRect(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - (hw - r)
  const dy = Math.abs(y - cy) - (hh - r)
  const ox = Math.max(dx, 0)
  const oy = Math.max(dy, 0)
  return Math.hypot(ox, oy) + Math.min(Math.max(dx, dy), 0) - r
}
function sdEllipse(x, y, cx, cy, rx, ry) {
  // approximate SDF, good enough for antialiasing
  const k = Math.hypot((x - cx) / rx, (y - cy) / ry)
  return (k - 1) * Math.min(rx, ry)
}
function sdTriangle(x, y, a, b, c) {
  const seg = (p, q) => {
    const pq = [q[0] - p[0], q[1] - p[1]]
    const pp = [x - p[0], y - p[1]]
    const t = clamp01((pp[0] * pq[0] + pp[1] * pq[1]) / (pq[0] * pq[0] + pq[1] * pq[1]))
    return Math.hypot(pp[0] - pq[0] * t, pp[1] - pq[1] * t)
  }
  const cross = (p, q) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0])
  const s1 = cross(a, b)
  const s2 = cross(b, c)
  const s3 = cross(c, a)
  const inside = (s1 <= 0 && s2 <= 0 && s3 <= 0) || (s1 >= 0 && s2 >= 0 && s3 >= 0)
  const d = Math.min(seg(a, b), seg(b, c), seg(c, a))
  return inside ? -d : d
}
const mix = (c1, c2, t) => c1.map((v, i) => v + (c2[i] - v) * t)

// palette
const gradTop = [99, 102, 241] // indigo
const gradBot = [56, 189, 248] // sky
const bubble = [255, 255, 255]
const dots = [
  [255, 107, 107], // coral
  [255, 193, 69], // amber
  [6, 214, 160], // teal
]

function render(size, { maskable }) {
  const rgba = Buffer.alloc(size * size * 4)
  const s = size
  // maskable icons keep content inside the 80% safe zone and fill the full square
  const shapeScale = maskable ? 0.78 : 1
  const bgRadius = maskable ? 0 : s * 0.22
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const px = x + 0.5
      const py = y + 0.5
      let r = 0, g = 0, b = 0, a = 0
      // background
      const bgCov = maskable ? 1 : coverage(sdRoundRect(px, py, s / 2, s / 2, s / 2, s / 2, bgRadius))
      if (bgCov > 0) {
        const t = py / s
        ;[r, g, b] = mix(gradTop, gradBot, t)
        a = bgCov
      }
      // speech bubble: ellipse + tail, scaled around center
      const cx = s / 2
      const cy = s / 2
      const sx = (px - cx) / shapeScale + cx
      const sy = (py - cy) / shapeScale + cy
      const bubbleD = Math.min(
        sdEllipse(sx, sy, s * 0.5, s * 0.44, s * 0.34, s * 0.26),
        sdTriangle(
          sx, sy,
          [s * 0.34, s * 0.58],
          [s * 0.52, s * 0.66],
          [s * 0.36, s * 0.82],
        ),
      )
      const bubbleCov = coverage(bubbleD * shapeScale) * bgCov
      if (bubbleCov > 0) {
        ;[r, g, b] = mix([r, g, b], bubble, bubbleCov)
      }
      // three dots
      const dotY = s * 0.44
      const dotR = s * 0.055
      for (let i = 0; i < 3; i++) {
        const dotX = s * (0.36 + 0.14 * i)
        const d = Math.hypot(sx - dotX, sy - dotY) - dotR
        const cov = coverage(d * shapeScale) * bgCov
        if (cov > 0) [r, g, b] = mix([r, g, b], dots[i], cov)
      }
      const o = (y * s + x) * 4
      rgba[o] = Math.round(r)
      rgba[o + 1] = Math.round(g)
      rgba[o + 2] = Math.round(b)
      rgba[o + 3] = Math.round(a * 255)
    }
  }
  return encodePNG(s, rgba)
}

const targets = [
  ['icon-192.png', 192, { maskable: false }],
  ['icon-512.png', 512, { maskable: false }],
  ['icon-maskable-192.png', 192, { maskable: true }],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { maskable: true }],
]
for (const [name, size, opts] of targets) {
  writeFileSync(join(outDir, name), render(size, opts))
  console.log('wrote', name)
}

// When the Capacitor Android project exists, keep its launcher artwork in sync
// with the PWA. These are generated assets, so no native image toolchain is needed.
const androidRes = join(projectRoot, 'android', 'app', 'src', 'main', 'res')
const androidDensities = [
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
]
for (const [density, legacySize, foregroundSize] of androidDensities) {
  const targetDir = join(androidRes, `mipmap-${density}`)
  mkdirSync(targetDir, { recursive: true })
  writeFileSync(join(targetDir, 'ic_launcher.png'), render(legacySize, { maskable: false }))
  writeFileSync(
    join(targetDir, 'ic_launcher_round.png'),
    render(legacySize, { maskable: false }),
  )
  writeFileSync(
    join(targetDir, 'ic_launcher_foreground.png'),
    render(foregroundSize, { maskable: true }),
  )
  console.log('wrote Android launcher', density)
}
