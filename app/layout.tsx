import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'S&P 500 / US M2 Money Supply',
  description: 'SPX divided by US M2 money supply from 1989 to present — dark-theme ratio chart',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
