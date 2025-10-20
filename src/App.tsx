import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import CommitPage from './pages/CommitPage';
import ReadmePage from './pages/ReadmePage';
import UploadZipPage from './pages/UploadZipPage';
import ChangelogPage from './pages/ChangelogPage';
import EditorPage from './pages/EditorPage';

function AppLayout() {
  const location = useLocation();
  const isEditorPage = location.pathname.startsWith('/editor');

  if (isEditorPage) {
    return <EditorPage />;
  }

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/commit" element={<CommitPage />} />
          <Route path="/readme" element={<ReadmePage />} />
          <Route path="/upload-zip" element={<UploadZipPage />} />
          <Route path="/changelog" element={<ChangelogPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}


export default function App() {
  return (
    <Routes>
      <Route path="/editor" element={<EditorPage />} />
      <Route path="*" element={<AppLayout />} />
    </Routes>
  );
}