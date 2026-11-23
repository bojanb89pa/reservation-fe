import '../i18n';
import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { SessionExpiredNotice } from '../components/layout/SessionExpiredNotice';
import { AppRouter } from '../routes/AppRouter';

export function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <SessionExpiredNotice />
        <AppRouter />
      </QueryProvider>
    </BrowserRouter>
  );
}
