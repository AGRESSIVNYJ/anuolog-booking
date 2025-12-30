import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Запись на сеанс мануальной терапии',
  description: 'Онлайн запись на сеанс мануальной терапии',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}




