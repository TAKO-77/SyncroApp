// Pictures the user picks (profile photo, note images) are redrawn as JPEG before they are stored.

const TYPES = ['image/jpeg', 'image/png', 'image/webp']
/** For the `accept` attribute of file inputs. */
export const IMAGE_ACCEPT = TYPES.join(',')
export const isAcceptedImage = (file: File, maxMb: number) => TYPES.includes(file.type) && file.size <= maxMb * 1024 * 1024

type Frame = { width: number; height: number; source?: [number, number, number, number] }

/** Draws the picked image on a canvas; `frame` gets its size and returns the canvas size and, optionally, the part to draw. */
export async function drawImage(file: File, frame: (width: number, height: number) => Frame): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const { width, height, source = [0, 0, image.width, image.height] } = frame(image.width, image.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error()
    // JPEG has no transparency; paint a white background so transparent PNGs stay legible.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, ...source, 0, 0, width, height)
    return canvas
  } finally { URL.revokeObjectURL(url) }
}
