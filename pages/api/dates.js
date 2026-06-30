import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  const dir = path.join(process.cwd(), 'data')
  try {
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort()
    res.status(200).json(files)
  } catch {
    res.status(200).json([])
  }
}
