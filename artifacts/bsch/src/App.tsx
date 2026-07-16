import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Route, Switch, Router as WouterRouter, useLocation, Redirect } from 'wouter';
import { useGetMe } from '@workspace/api-client-react';

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

  // Redirect to dashboard if logged in and on root
  if (user?.isAuthenticated && location === '/') {
    return <Redirect to="/dashboard" />;
  }

  return (
    <Switch>
      <Route path="/" component={Login} />

      {/* Protected Routes */}
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/departments/:id"><ProtectedRoute component={DepartmentDetail} /></Route>
      <Route path="/add-case"><ProtectedRoute component={AddCase} /></Route>
      <Route path="/case/:id"><ProtectedRoute component={CaseDetail} /></Route>
      <Route path="/waiting-cases"><ProtectedRoute component={WaitingCases} /></Route>
      <Route path="/artificial-respiration"><ProtectedRoute component={RespirationList} /></Route>
      <Route path="/bulk-import"><ProtectedRoute component={BulkImport} /></Route>
      <Route path="/advanced-search"><ProtectedRoute component={Search} /></Route>
      <Route path="/print-reports"><ProtectedRoute component={PrintReports} /></Route>
      <Route path="/backup"><ProtectedRoute component={Backup} /></Route>
      <Route path="/occupancy-report"><ProtectedRoute component={OccupancyReport} /></Route>

      <Route><ProtectedRoute component={NotFound} /></Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
