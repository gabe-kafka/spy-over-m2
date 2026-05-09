export interface RatioPoint {
  date: string   // YYYY-MM-DD (first of month)
  ratio: number
  spx: number
  m2: number
}

async function fetchCSVRaw(seriesId: string): Promise<{ date: string; value: number }[]> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`
  const res = await fetch(url, {
    next: { revalidate: 86400 },
    headers: { 'User-Agent': 'SPX-M2-Chart/1.0' },
  })
  if (!res.ok) throw new Error(`FRED ${seriesId}: HTTP ${res.status}`)
  const text = await res.text()
  const rows: { date: string; value: number }[] = []
  for (const line of text.split('\n').slice(1)) {
    const comma = line.indexOf(',')
    if (comma < 0) continue
    const date = line.slice(0, comma).trim()
    const raw = line.slice(comma + 1).trim()
    if (!date || raw === '.' || raw === '') continue
    const value = parseFloat(raw)
    if (!isNaN(value)) rows.push({ date, value })
  }
  return rows
}

export async function fetchRatioData(): Promise<RatioPoint[]> {
  const [spxRaw, m2Raw] = await Promise.all([
    fetchCSVRaw('SP500'),
    fetchCSVRaw('M2SL'),
  ])

  // SP500 on FRED is monthly (period average). Key by YYYY-MM.
  const spxMonthly = new Map<string, number>()
  for (const { date, value } of spxRaw) {
    spxMonthly.set(date.substring(0, 7), value)
  }

  // M2SL is monthly. Key by YYYY-MM.
  const m2Monthly = new Map<string, number>()
  for (const { date, value } of m2Raw) {
    m2Monthly.set(date.substring(0, 7), value)
  }

  const result: RatioPoint[] = []
  for (const [ym, spx] of spxMonthly) {
    if (ym < '1989-01') continue
    const m2 = m2Monthly.get(ym)
    if (m2 !== undefined && m2 > 0) {
      result.push({ date: `${ym}-01`, ratio: spx / m2, spx, m2 })
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date))
}
