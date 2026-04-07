import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import Shell from './Shell';
import './globals.css';

export const metadata = {
  title: 'dotball',
  description: 'IPL 2026 fantasy with friends — no money, just cricket knowledge',
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
        <ToastProvider>
          <AuthProvider>
            <Shell>{children}</Shell>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
