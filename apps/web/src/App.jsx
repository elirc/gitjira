import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { TopNav } from './components/TopNav.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { Footer } from './components/Footer.jsx';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { CommandPalette } from './components/CommandPalette.jsx';

// LEARN (sprint 12): route-level CODE SPLITTING. Before this, one 434 kB bundle
// held every page — a logged-out visitor to /login downloaded the board's
// drag-and-drop engine, the backlog, everything, before seeing a login form.
// React.lazy + a dynamic import() tells the bundler to emit each page as its own
// chunk, fetched only when its route is visited. The initial download shrinks to
// the shell + the current route; the rest arrives on navigation.
//
// GOTCHA: React.lazy wants a module with a DEFAULT export, but our pages use
// NAMED exports (consistent with the rest of the codebase). The `.then` remaps
// the named export to `default` so we don't have to change every page file.
const named = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));

const HomePage = named(() => import('./pages/HomePage.jsx'), 'HomePage');
const ProjectsPage = named(() => import('./pages/ProjectsPage.jsx'), 'ProjectsPage');
const ProjectBoardPage = named(() => import('./pages/ProjectBoardPage.jsx'), 'ProjectBoardPage');
const BacklogPage = named(() => import('./pages/BacklogPage.jsx'), 'BacklogPage');
const LoginPage = named(() => import('./pages/LoginPage.jsx'), 'LoginPage');
const RegisterPage = named(() => import('./pages/RegisterPage.jsx'), 'RegisterPage');
const NotFoundPage = named(() => import('./pages/NotFoundPage.jsx'), 'NotFoundPage');

export function App() {
  return (
    <div className="app-shell">
      <CommandPalette />
      <TopNav />
      <div className="app-body">
        <Sidebar />
        <main className="content">
          {/* LEARN: the boundary wraps the routed content so a render crash on
              one page shows a recoverable message instead of a blank app. */}
          <ErrorBoundary>
            {/* Suspense shows the fallback while a route's chunk is fetching. */}
            <Suspense fallback={<p className="route-loading">Loading…</p>}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                {/* LEARN: everything inside ProtectedRoute requires a session.
                    Public routes are the explicit exception, not the default —
                    a new page added tomorrow is protected unless someone
                    deliberately moves it out. Safe by default. */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/projects/:key" element={<ProjectBoardPage />} />
                  <Route path="/projects/:key/backlog" element={<BacklogPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <Footer />
    </div>
  );
}
