import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'missing date' })

  const filePath = path.join(process.cwd(), 'data', `${date}.json`)
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    res.status(200).json(JSON.parse(raw))
  } catch {
    res.status(404).json({ error: 'not found' })
  }
}
