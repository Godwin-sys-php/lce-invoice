import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/invoices')
      .then((res) => setInvoices(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-gray-500">Chargement...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Factures</h2>
        <Link
          to="/invoices/new"
          className="px-4 py-2.5 bg-black text-white text-sm font-medium hover:bg-[#333] transition-colors rounded-lg"
        >
          Nouvelle Facture
        </Link>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-[#e5e5e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e5e5]">
              <th className="text-left px-4 py-3 font-medium">N° Facture</th>
              <th className="text-left px-4 py-3 font-medium">Client</th>
              <th className="text-left px-4 py-3 font-medium">Créé par</th>
              <th className="text-left px-4 py-3 font-medium">Articles</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">PDF</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Aucune facture
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-[#e5e5e5] last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                  <td className="px-4 py-3">{inv.client_name}</td>
                  <td className="px-4 py-3">{inv.created_by}</td>
                  <td className="px-4 py-3">{inv.item_count}</td>
                  <td className="px-4 py-3">{formatDate(inv.created_at)}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`/pdfs/${inv.invoice_number}.pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black underline hover:no-underline font-medium"
                    >
                      Voir PDF
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {invoices.length === 0 ? (
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-6 text-center text-gray-400">
            Aucune facture
          </div>
        ) : (
          invoices.map((inv) => (
            <div key={inv.id} className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{inv.invoice_number}</span>
                <span className="text-xs text-gray-500">{formatDate(inv.created_at)}</span>
              </div>
              <div className="text-sm text-gray-600 mb-1">{inv.client_name}</div>
              <div className="text-xs text-gray-400 mb-3">
                {inv.created_by} · {inv.item_count} article{inv.item_count > 1 ? 's' : ''}
              </div>
              <a
                href={`http://localhost:3001/pdfs/${inv.invoice_number}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-[#333] transition-colors"
              >
                Voir PDF
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
