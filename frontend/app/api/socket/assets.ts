import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'

const UPLOADS_DIR = join(process.cwd(), 'uploads')

export async function storeAsset(id: string, stream: any) {
  await writeFile(join(UPLOADS_DIR, id), stream)
}

export async function loadAsset(id: string) {
  return await readFile(join(UPLOADS_DIR, id))
} 