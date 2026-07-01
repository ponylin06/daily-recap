import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'data', '_holdings.json'), 'utf-8')
    res.status(200).json(JSON.parse(raw))
  } catch {
    res.status(200).json({ holdings: [] })
  }
}
