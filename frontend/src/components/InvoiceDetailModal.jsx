import { useState, useEffect, useCallback } from 'react';
import api from '../api';

function formatUSD(amount) {
  return '$' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export default function InvoiceDetailModal({ invoiceId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;
    setLoading(true);
    api.get(`/invoices/${invoiceId}/history`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!invoiceId) return null;

  const grandTotal = data?.items?.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) || 0;

  return (
    <>
      {/* Desktop modal */}
      <div
        className="hidden md:flex fixed inset-0 bg-black/30 items-center justify-center z-50"
        onClick={handleBackdropClick}
      >
        <div className="bg-white border border-[#e5e5e5] shadow-lg w-full max-w-2xl max-h-[85vh] overflow-auto rounded-xl">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : !data ? (
            <div className="p-8 text-center text-gray-500">Erreur de chargement</div>
          ) : (
            <ModalContent data={data} grandTotal={grandTotal} onClose={onClose} />
          )}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div className="md:hidden fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[90vh] overflow-auto">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : !data ? (
            <div className="p-8 text-center text-gray-500">Erreur de chargement</div>
          ) : (
            <ModalContent data={data} grandTotal={grandTotal} onClose={onClose} />
          )}
        </div>
      </div>
    </>
  );
}

function ModalContent({ data, grandTotal, onClose }) {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold">{data.invoice_number}</h3>
            {data.type === 'proforma' ? (
              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-gray-200 text-gray-600">Proforma</span>
            ) : (
              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-black text-white">Facture</span>
            )}
          </div>
          <div className="text-sm text-gray-600">{data.client_name}</div>
          <div className="text-xs text-gray-400 mt-1">
            {formatDate(data.created_at)} &middot; par {data.created_by_username}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-black text-2xl leading-none px-1"
        >
          &times;
        </button>
      </div>

      {/* Line items table */}
      <div className="border border-[#e5e5e5] rounded-lg overflow-hidden mb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-[#e5e5e5]">
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="text-center px-3 py-2 text-xs font-medium text-gray-500 uppercase">Qté</th>
              <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Prix unit.</th>
              <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Sous-total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={item.id || i} className="border-b border-[#e5e5e5] last:border-b-0">
                <td className="px-3 py-2 text-gray-500">{formatDate(item.item_date)}</td>
                <td className="px-3 py-2">{item.product_name}</td>
                <td className="px-3 py-2 text-center">{item.quantity}</td>
                <td className="px-3 py-2 text-right">{formatUSD(item.unit_price)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatUSD(item.quantity * item.unit_price)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td colSpan={4} className="px-3 py-2 text-right text-sm font-medium text-gray-500">TOTAL</td>
              <td className="px-3 py-2 text-right text-base font-bold">{formatUSD(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Proforma history */}
      {data.proforma_history && data.proforma_history.length > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
            Historique des versions proforma
          </h4>
          <div className="space-y-2">
            {data.proforma_history.map((h) => (
              <div key={h.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-600">{formatDateTime(h.created_at)}</span>
                <a
                  href={`${import.meta.env.VITE_PDF_URL_PREFIX}${h.pdf_filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-black underline hover:no-underline font-medium"
                >
                  Voir PDF
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current PDF */}
      <div className="flex justify-end">
        <a
          href={`${import.meta.env.VITE_PDF_URL_PREFIX}${data.invoice_number}.pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-[#333] transition-colors"
        >
          Voir PDF actuel
        </a>
      </div>
    </div>
  );
}
