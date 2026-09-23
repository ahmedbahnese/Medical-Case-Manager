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
import OvrIncidentReport from '@/pages/ovr-incident-report';
import OvrManagement from '@/pages/ovr-management';
import Settings from '@/pages/settings';
import DischargeHistory from '@/pages/discharge-history';
import AuditLog from '@/pages/audit-log';
import QualityDashboard from '@/pages/quality-dashboard';
import OutpatientClinics from '@/pages/outpatient-clinics';

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

function AccessDenied() {
  return <div className="flex min-h-[60vh] items-center justify-center p-8 text-center"><div><h1 className="text-3xl font-bold mb-3">لا توجد صلاحية</h1><p className="text-muted-foreground">هذا الحساب لا يملك صلاحية الوصول إلى هذه الصفحة.</p></div></div>;
}

function hasPageAccess(user: any, href?: string, founderOnly = false) {
  if (founderOnly) return Boolean(user?.isFounder);
  if (!href || user?.isFounder) return true;
  if (Array.isArray(user?.pagePermissions) && user.pagePermissions.length > 0) {
    return user.pagePermissions.find((permission: any) => permission.href === href)?.access !== "none";
  }
  if (Array.isArray(user?.allowedPages) && user.allowedPages.length > 0) return user.allowedPages.includes(href);
  return true;
}

function ProtectedRoute({ component: Component, pageHref, founderOnly = false }: { component: React.ComponentType; pageHref?: string; founderOnly?: boolean }) {
  const { data: user, isLoading } = useGetMe();

  if (isLoading) return <div className="h-screen bg-background" />;
  if (!user?.isAuthenticated) return <Redirect to="/" />;
  if (!hasPageAccess(user, pageHref, founderOnly)) return <Layout><AccessDenied /></Layout>;

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
    return <Redirect to={user.isFounder ? "/dashboard" : ((user as any).startPage || "/dashboard")} />;
  }

  return (
    <Switch>
      <Route path="/" component={Login} />

      {/* Core */}
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} pageHref="/dashboard" /></Route>
      <Route path="/departments/:id"><ProtectedRoute component={DepartmentDetail} /></Route>
      <Route path="/add-case"><ProtectedRoute component={AddCase} pageHref="/add-case" /></Route>
      <Route path="/case/:id"><ProtectedRoute component={CaseDetail} /></Route>
      <Route path="/waiting-cases"><ProtectedRoute component={WaitingCases} pageHref="/waiting-cases" /></Route>
      <Route path="/outpatient-clinics"><ProtectedRoute component={OutpatientClinics} pageHref="/outpatient-clinics" /></Route>
      <Route path="/artificial-respiration"><ProtectedRoute component={RespirationList} pageHref="/artificial-respiration" /></Route>

      {/* Import */}
      <Route path="/bulk-import"><ProtectedRoute component={BulkImport} pageHref="/bulk-import" /></Route>

      {/* Reports */}
      <Route path="/occupancy-report"><ProtectedRoute component={OccupancyReport} pageHref="/occupancy-report" /></Route>
      <Route path="/print-reports"><ProtectedRoute component={PrintReports} pageHref="/print-reports" /></Route>
      <Route path="/incident-report"><ProtectedRoute component={IncidentReport} pageHref="/incident-report" /></Route>
      <Route path="/ovr-incident-report"><ProtectedRoute component={OvrIncidentReport} pageHref="/ovr-incident-report" /></Route>
      <Route path="/ovr-management"><ProtectedRoute component={OvrManagement} pageHref="/ovr-management" /></Route>
      <Route path="/quality-dashboard"><ProtectedRoute component={QualityDashboard} pageHref="/quality-dashboard" /></Route>

      {/* Search & History */}
      <Route path="/advanced-search"><ProtectedRoute component={Search} pageHref="/advanced-search" /></Route>
      <Route path="/discharge-history"><ProtectedRoute component={DischargeHistory} pageHref="/discharge-history" /></Route>
      <Route path="/audit-log"><ProtectedRoute component={AuditLog} founderOnly /></Route>

      {/* System */}
      <Route path="/backup"><ProtectedRoute component={Backup} founderOnly /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} founderOnly /></Route>

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
