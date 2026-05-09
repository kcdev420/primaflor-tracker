import "./globals.css";

export const metadata = {
  title: "Primaflor Tracker - Control de Cosecha",
  description: "Sistema interno de registro de gavetas y palets",
  icons: {
    icon: "/favicon.ico", // Aquí irá tu icono
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}