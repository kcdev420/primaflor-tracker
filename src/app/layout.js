import './globals.css'

export const metadata = {
  title: 'Primaflor Tracker',
  description: 'Sistema de trazabilidad en campo',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  )
}