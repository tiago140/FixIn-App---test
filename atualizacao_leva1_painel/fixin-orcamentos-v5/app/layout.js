import './globals.css';

export const metadata = {
  title: 'FixIn Reformas — Orçamentos',
  description: 'Sistema interno de orçamentos da FixIn Reformas',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('fixin_bg_theme');if(t==='claro'||t==='creme')document.documentElement.setAttribute('data-bg',t)}catch(e){}",
          }}
        />
      </head>
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
