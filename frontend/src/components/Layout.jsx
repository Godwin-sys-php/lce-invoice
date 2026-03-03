import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();

  const sidebarLinkClass = ({ isActive }) =>
    `block px-4 py-2.5 text-sm font-medium transition-colors rounded-lg mx-2 ${
      isActive
        ? 'bg-black text-white'
        : 'text-[#111] hover:bg-gray-100'
    }`;

  const bottomNavClass = ({ isActive }) =>
    `flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors flex-1 ${
      isActive ? 'text-black' : 'text-gray-400'
    }`;

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 border-r border-[#e5e5e5] flex-col bg-white shrink-0">
        <div className="px-4 py-6 border-b border-[#e5e5e5]">
          <h1 className="text-lg font-bold tracking-wide">LE CONSULAT EXPRESS</h1>
        </div>
        <nav className="flex-1 py-4 space-y-1">
          <NavLink to="/invoices" className={sidebarLinkClass}>
            Factures
          </NavLink>
          <NavLink to="/products" className={sidebarLinkClass}>
            Produits
          </NavLink>
          <NavLink to="/clients" className={sidebarLinkClass}>
            Clients
          </NavLink>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-[#e5e5e5] flex items-center justify-between px-4 md:px-6 bg-white shrink-0">
          <h1 className="text-sm font-bold tracking-wide md:hidden">LE CONSULAT EXPRESS</h1>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:inline">{user?.username}</span>
            <button
              onClick={logout}
              className="text-sm px-3 py-1.5 bg-black text-white hover:bg-[#333] transition-colors rounded-lg"
            >
              Déconnexion
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto px-4 py-4 md:p-6 bg-[#fafafa] pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e5e5] flex z-30">
        <NavLink to="/invoices" className={bottomNavClass}>
          <span className="text-lg mb-0.5">📄</span>
          Factures
        </NavLink>
        <NavLink to="/products" className={bottomNavClass}>
          <span className="text-lg mb-0.5">📦</span>
          Produits
        </NavLink>
        <NavLink to="/clients" className={bottomNavClass}>
          <span className="text-lg mb-0.5">👤</span>
          Clients
        </NavLink>
      </nav>
    </div>
  );
}
