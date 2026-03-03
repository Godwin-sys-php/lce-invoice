import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Invoices from './pages/Invoices';
import InvoiceNew from './pages/InvoiceNew';
import Products from './pages/Products';
import Clients from './pages/Clients';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#111',
              color: '#fff',
              fontSize: '14px',
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/new" element={<InvoiceNew />} />
            <Route path="/products" element={<Products />} />
            <Route path="/clients" element={<Clients />} />
          </Route>
          <Route path="*" element={<Navigate to="/invoices" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
