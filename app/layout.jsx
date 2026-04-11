import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Shell from './Shell';
import './globals.css';

export const metadata = {
  title: 'dotball',
  description: 'Pure cricket knowledge. Friendly stakes.',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'dotball' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#6366f1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <Shell>{children}</Shell>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
