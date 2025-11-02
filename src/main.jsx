import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import '@fortawesome/fontawesome-free/css/all.min.css';

// Components
import Navbar from './components/navbar.jsx'
import Footer from './components/footer.jsx'

// Pages
import Index from './pages/index.jsx'
import Monitor from './pages/monitor.jsx'
import Error from './pages/error.jsx'

// Bootstrap
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// SCSS
import './scss/theme.scss'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Navbar />
      <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/monitor" element={<Monitor />} />
          <Route path="*" element={<Error />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  </StrictMode>,
)
