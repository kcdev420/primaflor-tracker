import "./globals.css";

export const metadata = {
  title: "Primaflor Tracker - Control de Cosecha",
  description: "Sistema interno de registro de gavetas y palets",
  icons: {
    icon: "/favicon.ico", 
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="antialiased">
        
        {/* Aquí se carga toda tu aplicación */}
        {children}

        {/* FOOTER FLOTANTE GLOBAL (Estilo Píldora Premium) */}
        {/* fixed bottom-4 lo mantiene flotando siempre, sin crear barras de fondo.
            pointer-events-none hace que no bloquee la pantalla. */}
        <footer className="fixed bottom-4 w-full flex justify-center z-[100] pointer-events-none">
          <a 
            href="https://kcdev420.github.io/CV/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="pointer-events-auto text-[9px] md:text-[11px] font-bold text-white/80 uppercase tracking-widest transition-all duration-300 hover:text-white bg-black/40 px-5 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:bg-black/60 hover:scale-105 hover:border-white/30"
          >
            Designed & Developed by Kevin Mora
          </a>
        </footer>

      </body>
    </html>
  );
}