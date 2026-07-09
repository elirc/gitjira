import { Routes, Route } from 'react-router-dom';
import { TopNav } from './components/TopNav.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { Footer } from './components/Footer.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { ProjectsPage } from './pages/ProjectsPage.jsx';
import { ProjectBoardPage } from './pages/ProjectBoardPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';

export function App() {
  return (
    <div className="app-shell">
      <TopNav />
      <div className="app-body">
        <Sidebar />
        <main className="content">
          {/* LEARN: the boundary wraps the routed content so a render crash on
              one page shows a recoverable message instead of a blank app. */}
          <ErrorBoundary>
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
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
      <Footer />
    </div>
  );
}
