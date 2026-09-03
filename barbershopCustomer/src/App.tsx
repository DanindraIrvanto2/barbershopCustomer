import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Booking from './pages/Booking';
import OrderHistory from './pages/OrderHistory';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/history" element={<OrderHistory />} />
        <Route path="/orders" element={<OrderHistory />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;