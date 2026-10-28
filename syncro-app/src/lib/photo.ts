import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { isValidPhoto } from '@/lib/profile'

const SIZE = 256

/**
 * Lets the user pick a photo and returns it as a square 256 px JPEG data URI, the format the
 * web app stores in `profiles.photo`. Returns null when the user cancels.
 */
export async function pickProfilePhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 })
  if (result.canceled || !result.assets?.length) return null
  const { uri, width, height } = result.assets[0]
  const side = Math.min(width, height)
  const context = ImageManipulator.manipulate(uri)
  context.crop({ originX: (width - side) / 2, originY: (height - side) / 2, width: side, height: side })
  context.resize({ width: SIZE, height: SIZE })
  const image = await context.renderAsync()
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true })
  const photo = `data:image/jpeg;base64,${saved.base64 ?? ''}`
  if (!isValidPhoto(photo)) throw new Error('invalid photo')
  return photo
}
