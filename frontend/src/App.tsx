import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Hub from './pages/Hub';
import PDFReader from './pages/PDFReader';
import OfficeHours from './pages/OfficeHours';
import Productivity from './pages/Productivity';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-inter">
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
  );
}

export default App;
