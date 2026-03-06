import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Hub from './pages/Hub';
import PDFReader from './pages/PDFReader';
import OfficeHours from './pages/OfficeHours';
import Productivity from './pages/Productivity';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-inter transition-colors duration-300">
          <Navigation />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/hub" element={<Hub />} />
            <Route path="/pdf-reader" element={<PDFReader />} />
            <Route path="/office-hours" element={<OfficeHours />} />
            <Route path="/productivity" element={<Productivity />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
