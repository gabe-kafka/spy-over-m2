import dynamic from 'next/dynamic'
import { fetchRatioData, type RatioPoint } from '@/lib/fred'

export const revalidate = 86400

const RatioChart = dynamic(() => import('@/components/RatioChart'), { ssr: false })

export default async function Home() {
  let data: RatioPoint[] = []
  let errorMsg = ''

  try {
    data = await fetchRatioData()
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : 'Unknown error'
    console.error('FRED fetch failed:', e)
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0d1117',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 20px 12px',
      }}
    >
      {/* Title */}
      <div style={{ marginBottom: 8 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(18px, 3vw, 26px)',
            fontWeight: 700,
            color: '#e6edf3',
            letterSpacing: '-0.3px',
          }}
        >
          S&amp;P 500 / US M2 Money Supply
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8b949e' }}>
          Monthly ratio of the S&amp;P 500 Index to US M2 money supply (1989 – present)
        </p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { color: '#3fb950', label: 'Month-over-month gain' },
          { color: '#f85149', label: 'Month-over-month decline' },
          { color: '#ffd700', label: 'Dot-com bubble peak (reference line)', dashed: true },
        ].map(({ color, label, dashed }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#8b949e' }}>
            {dashed ? (
              <svg width={22} height={10}>
                <line x1={0} y1={5} x2={22} y2={5} stroke={color} strokeWidth={2} strokeDasharray="5,3" />
              </svg>
            ) : (
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: color }} />
            )}
            {label}
          </div>
        ))}
      </div>

      {/* Chart */}
      {errorMsg ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f85149',
            fontSize: 14,
          }}
        >
          Failed to load data: {errorMsg}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 400 }}>
          <RatioChart data={data} />
        </div>
      )}

      {/* Source note */}
      <p
        style={{
          margin: '10px 0 0',
          fontSize: 11,
          color: '#6e7681',
          fontStyle: 'italic',
          textAlign: 'right',
        }}
      >
        Sources: S&amp;P 500 (SP500) · M2 Money Stock (M2SL) — Federal Reserve Bank of St. Louis (FRED)
      </p>
    </main>
  )
}
