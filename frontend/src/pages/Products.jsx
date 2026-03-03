import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

function formatUSD(amount) {
  if (amount == null) return 'Prix à définir';
  return '$' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', price: '' });

  const fetchProducts = () => {
    api.get('/products')
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', price: '' });
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({ name: product.name, price: product.price != null ? String(product.price) : '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: form.name,
      price: form.price !== '' ? parseFloat(form.price) : null,
    };

    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, data);
        toast.success('Produit modifié');
      } else {
        await api.post('/products', data);
        toast.success('Produit créé');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Supprimer "${product.name}" ?`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      toast.success('Produit supprimé');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  };

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Produits</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-black text-white text-sm font-medium hover:bg-[#333] transition-colors rounded-lg"
        >
          Nouveau Produit
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-[#e5e5e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e5e5]">
              <th className="text-left px-4 py-3 font-medium">Nom</th>
              <th className="text-left px-4 py-3 font-medium">Prix</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  Aucun produit
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-[#e5e5e5] last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{formatUSD(p.price)}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(p)} className="text-sm underline hover:no-underline">
                      Modifier
                    </button>
                    <button onClick={() => handleDelete(p)} className="text-sm underline hover:no-underline text-gray-500">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {products.length === 0 ? (
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-6 text-center text-gray-400">
            Aucun produit
          </div>
        ) : (
          products.map((p) => (
            <div key={p.id} className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{p.name}</span>
                <span className="text-sm text-gray-600">{formatUSD(p.price)}</span>
              </div>
              <div className="flex gap-3 mt-3">
                <button onClick={() => openEdit(p)} className="text-sm underline hover:no-underline">
                  Modifier
                </button>
                <button onClick={() => handleDelete(p)} className="text-sm underline hover:no-underline text-gray-500">
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <>
          {/* Desktop modal */}
          <div className="hidden md:flex fixed inset-0 bg-black/30 items-center justify-center z-50">
            <div className="bg-white border border-[#e5e5e5] shadow-lg p-6 w-full max-w-md rounded-xl">
              <h3 className="text-lg font-bold mb-4">
                {editing ? 'Modifier le produit' : 'Nouveau produit'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Prix (USD) <span className="text-gray-400 font-normal">— laisser vide = prix à définir</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm border border-[#e5e5e5] hover:bg-gray-50 transition-colors rounded-lg">
                    Annuler
                  </button>
                  <button type="submit" className="px-4 py-2.5 bg-black text-white text-sm font-medium hover:bg-[#333] transition-colors rounded-lg">
                    {editing ? 'Enregistrer' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Mobile bottom sheet */}
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowModal(false)} />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6">
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
              <h3 className="text-lg font-bold mb-4">
                {editing ? 'Modifier le produit' : 'Nouveau produit'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Prix (USD) <span className="text-gray-400 font-normal">— laisser vide = prix à définir</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm border border-[#e5e5e5] hover:bg-gray-50 transition-colors rounded-lg">
                    Annuler
                  </button>
                  <button type="submit" className="flex-1 py-2.5 bg-black text-white text-sm font-medium hover:bg-[#333] transition-colors rounded-lg">
                    {editing ? 'Enregistrer' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
