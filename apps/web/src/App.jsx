import { Routes, Route } from 'react-router-dom';
import { TopNav } from './components/TopNav.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { Footer } from './components/Footer.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { ProjectsPage } from './pages/ProjectsPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';

export function App() {
  return (
    <div className="app-shell">
      <TopNav />
      <div className="app-body">
        <Sidebar />
        <main className="content">
          {/* LEARN: client-side routing — the server sends the same HTML for
              every URL; React Router swaps components based on location.
              The URL becomes application state you can bookmark and share,
              a property we will lean on hard in sprint 05. */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </main>
      </div>
      <Footer />
    </div>
  );
}
