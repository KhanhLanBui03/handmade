import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import AllProducts from './pages/AllProducts';
import AdminLayout from './components/AdminLayout';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import ProductForm from './pages/admin/ProductForm';
import ProductManager from './pages/admin/ProductManager';
import CategoryManager from './pages/admin/CategoryManager';
import StockImport from './pages/admin/StockImport';
import MaterialManager from './pages/admin/MaterialManager';
import OnlineOrders from './pages/admin/OnlineOrders';
import SalesStats from './pages/admin/SalesStats';

// Link cũ /product/:id → mở cửa sổ sản phẩm trên trang chính
function LegacyProductRedirect() {
  const { id } = useParams();
  return <Navigate to={`/?sp=${id}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang khách: trang chủ + trang tất cả sản phẩm */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="san-pham" element={<AllProducts />} />
        </Route>
        <Route path="/products" element={<Navigate to="/san-pham" replace />} />
        <Route path="/about" element={<Navigate to="/#lien-he" replace />} />
        <Route path="/product/:id" element={<LegacyProductRedirect />} />

        {/* Admin */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="online-orders" element={<OnlineOrders />} />
          <Route path="orders" element={<Navigate to="/admin/stats" replace />} />
          <Route path="stats" element={<SalesStats />} />
          <Route path="imports" element={<StockImport />} />
          <Route path="materials" element={<MaterialManager />} />
          <Route path="products" element={<ProductManager />} />
          <Route path="categories" element={<CategoryManager />} />
          <Route path="product/new" element={<ProductForm />} />
          <Route path="product/edit/:id" element={<ProductForm />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
