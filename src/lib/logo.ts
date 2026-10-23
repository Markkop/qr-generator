const MAX_SIDE = 512
const MAX_SVG_BYTES = 256 * 1024
const MAX_INPUT_BYTES = 10 * 1024 * 1024

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Downscales raster logos so history stays small. SVGs are kept as-is. */
export async function prepareLogo(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Pick an image file (PNG, JPEG, SVG, WebP or GIF).')
  if (file.size > MAX_INPUT_BYTES) throw new Error('That image is larger than 10 MB.')
  if (file.type === 'image/svg+xml') {
    if (file.size > MAX_SVG_BYTES) throw new Error('SVG logos must be under 256 KB.')
    return readAsDataUrl(file)
  }
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/png')
}
