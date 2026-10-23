import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

// Self-hosted so scanning works offline and never calls a CDN.
prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
  },
})

export type ScanResult = { status: 'match' } | { status: 'mismatch'; decoded: string } | { status: 'unreadable' }

export async function verifyScan(image: Blob, expected: string): Promise<ScanResult> {
  const results = await readBarcodes(image, { formats: ['QRCode'], tryHarder: true, maxNumberOfSymbols: 1 })
  const hit = results.find((r) => r.isValid)
  if (!hit) return { status: 'unreadable' }
  return hit.text === expected ? { status: 'match' } : { status: 'mismatch', decoded: hit.text }
}
