import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, useLocation, Redirect } from 'wouter';
import { useGetMe } from '@workspace/api-client-react';
import { SettingsProvider } from '@/contexts/settings-context';

import { Layout } from '@/components/layout';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import DepartmentDetail from '@/pages/department';
import AddCase from '@/pages/add-case';
import CaseDetail from '@/pages/case-detail';
import WaitingCases from '@/pages/waiting-cases';
import RespirationList from '@/pages/respiration';
import BulkImport from '@/pages/bulk-import';
import Search from '@/pages/search';
import PrintReports from '@/pages/print-reports';
import Backup from '@/pages/backup';
import OccupancyReport from '@/pages/occupancy-report';
import IncidentReport from '@/pages/incident-report';
import Settings from '@/pages/settings';
import DischargeHistory from '@/pages/discharge-history';
import AuditLog from '@/pages/audit-log';

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-bold mb-2">الصفحة غير موجودة</h2>
      <p className="text-muted-foreground max-w-md">عذراً، المسار الذي تحاول الوصول إليه غير موجود أو تم نقله.</p>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useGetMe();

  if (isLoading) return <div className="h-screen bg-background" />;
  if (!user?.isAuthenticated) return <Redirect to="/" />;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  const { data: user, isLoading } = useGetMe();
  const [location] = useLocation();

  if (isLoading) return <div className="h-screen bg-background" />;

  if (user?.isAuthenticated && location === '/') {
    return <Redirect to="/dashboard" />;
  }

  return (
    <Switch>
      <Route path="/" component={Login} />

      {/* Core */}
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/departments/:id"><ProtectedRoute component={DepartmentDetail} /></Route>
      <Route path="/add-case"><ProtectedRoute component={AddCase} /></Route>
      <Route path="/case/:id"><ProtectedRoute component={CaseDetail} /></Route>
      <Route path="/waiting-cases"><ProtectedRoute component={WaitingCases} /></Route>
      <Route path="/artificial-respiration"><ProtectedRoute component={RespirationList} /></Route>

      {/* Import */}
      <Route path="/bulk-import"><ProtectedRoute component={BulkImport} /></Route>

      {/* Reports */}
      <Route path="/occupancy-report"><ProtectedRoute component={OccupancyReport} /></Route>
      <Route path="/print-reports"><ProtectedRoute component={PrintReports} /></Route>
      <Route path="/incident-report"><ProtectedRoute component={IncidentReport} /></Route>

      {/* Search & History */}
      <Route path="/advanced-search"><ProtectedRoute component={Search} /></Route>
      <Route path="/discharge-history"><ProtectedRoute component={DischargeHistory} /></Route>
      <Route path="/audit-log"><ProtectedRoute component={AuditLog} /></Route>

      {/* System */}
      <Route path="/backup"><ProtectedRoute component={Backup} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>

      <Route><ProtectedRoute component={NotFound} /></Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
