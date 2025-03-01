import './globals.css';
import { ThemeProvider } from './components/theme/ThemeProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head />
      <body className="bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}