import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', birthday: '', notes: '' });

  const fetchClients = () => {
    api.get('/clients')
      .then((res) => setClients(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', phone: '', birthday: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (client) => {
    setEditing(client);
    setForm({
      name: client.name,
      phone: client.phone || '',
      birthday: client.birthday || '',
      notes: client.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/clients/${editing.id}`, form);
        toast.success('Client modifié');
      } else {
        await api.post('/clients', form);
        toast.success('Client créé');
      }
      setShowModal(false);
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  };

  const handleDelete = async (client) => {
    if (!confirm(`Supprimer "${client.name}" ?`)) return;
    try {
      await api.delete(`/clients/${client.id}`);
      toast.success('Client supprimé');
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  };

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  const modalForm = (
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
        <label className="block text-sm font-medium mb-1">Téléphone</label>
        <input
          type="text"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Date de naissance</label>
        <input
          type="date"
          value={form.birthday}
          onChange={(e) => setForm({ ...form, birthday: e.target.value })}
          className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg"
          rows={3}
        />
      </div>
    </form>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Clients</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-black text-white text-sm font-medium hover:bg-[#333] transition-colors rounded-lg"
        >
          Nouveau Client
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-[#e5e5e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e5e5]">
              <th className="text-left px-4 py-3 font-medium">Nom</th>
              <th className="text-left px-4 py-3 font-medium">Téléphone</th>
              <th className="text-left px-4 py-3 font-medium">Anniversaire</th>
              <th className="text-left px-4 py-3 font-medium">Notes</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Aucun client
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="border-b border-[#e5e5e5] last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.phone || '—'}</td>
                  <td className="px-4 py-3">{formatDate(c.birthday)}</td>
                  <td className="px-4 py-3 text-gray-500 truncate max-w-[200px]">{c.notes || '—'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(c)} className="text-sm underline hover:no-underline">
                      Modifier
                    </button>
                    <button onClick={() => handleDelete(c)} className="text-sm underline hover:no-underline text-gray-500">
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
        {clients.length === 0 ? (
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-6 text-center text-gray-400">
            Aucun client
          </div>
        ) : (
          clients.map((c) => (
            <div key={c.id} className="bg-white border border-[#e5e5e5] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="font-medium text-sm mb-1">{c.name}</div>
              <div className="text-sm text-gray-500 space-y-0.5">
                {c.phone && <div>{c.phone}</div>}
                {c.birthday && <div>Né(e) le {formatDate(c.birthday)}</div>}
                {c.notes && <div className="truncate">{c.notes}</div>}
              </div>
              <div className="flex gap-3 mt-3">
                <button onClick={() => openEdit(c)} className="text-sm underline hover:no-underline">
                  Modifier
                </button>
                <button onClick={() => handleDelete(c)} className="text-sm underline hover:no-underline text-gray-500">
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
                {editing ? 'Modifier le client' : 'Nouveau client'}
              </h3>
              {modalForm}
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm border border-[#e5e5e5] hover:bg-gray-50 transition-colors rounded-lg">
                  Annuler
                </button>
                <button onClick={handleSubmit} className="px-4 py-2.5 bg-black text-white text-sm font-medium hover:bg-[#333] transition-colors rounded-lg">
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile bottom sheet */}
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowModal(false)} />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[85vh] overflow-auto">
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
              <h3 className="text-lg font-bold mb-4">
                {editing ? 'Modifier le client' : 'Nouveau client'}
              </h3>
              {modalForm}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm border border-[#e5e5e5] hover:bg-gray-50 transition-colors rounded-lg">
                  Annuler
                </button>
                <button onClick={handleSubmit} className="flex-1 py-2.5 bg-black text-white text-sm font-medium hover:bg-[#333] transition-colors rounded-lg">
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
