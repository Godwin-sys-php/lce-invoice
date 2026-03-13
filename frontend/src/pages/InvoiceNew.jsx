import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import SearchableSelect from '../components/SearchableSelect';

function formatUSD(amount) {
  return '$' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateForInput(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

export default function InvoiceNew() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // Invoice type state (only for new invoices)
  const [invoiceType, setInvoiceType] = useState('invoice'); // 'invoice' or 'proforma'

  // Loading state for edit mode
  const [loading, setLoading] = useState(isEditMode);

  // Clients
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', phone: '', birthday: '', notes: '' });

  // Products
  const [products, setProducts] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', price: '' });
  const [productModalCallback, setProductModalCallback] = useState(null);

  // Line items
  const [items, setItems] = useState([
    { product_id: null, item_date: '', quantity: 1, unit_price: '' },
  ]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/clients').then((res) => setClients(res.data));
    api.get('/products').then((res) => setProducts(res.data));
  }, []);

  // Fetch invoice data when in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      setLoading(true);
      api.get(`/invoices/${id}`)
        .then((res) => {
          const invoice = res.data;
          setSelectedClientId(invoice.client_id);
          setInvoiceType(invoice.type || 'invoice');
          if (invoice.items && invoice.items.length > 0) {
            setItems(invoice.items.map((item) => ({
              product_id: item.product_id,
              item_date: formatDateForInput(item.item_date) || '',
              quantity: item.quantity,
              unit_price: item.unit_price,
            })));
          }
        })
        .catch((err) => {
          toast.error(err.response?.data?.error || 'Erreur lors du chargement de la facture');
          navigate('/invoices');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isEditMode, id, navigate]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Client options for SearchableSelect
  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: c.name + (c.phone ? ` — ${c.phone}` : ''),
  }));

  // Product options for SearchableSelect
  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name + (p.price != null ? ` — ${formatUSD(p.price)}` : ' — prix libre'),
  }));

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/clients', clientForm);
      setClients((prev) => [res.data, ...prev]);
      setSelectedClientId(res.data.id);
      setShowClientModal(false);
      toast.success('Client créé');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  };

  const selectProduct = async (index, productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const newItems = [...items];
    newItems[index].product_id = productId;

    if (product.price != null) {
      newItems[index].unit_price = product.price;
    } else {
      try {
        const res = await api.get(`/products/${productId}/last-price`);
        newItems[index].unit_price = res.data.last_price != null ? res.data.last_price : '';
      } catch {
        newItems[index].unit_price = '';
      }
    }

    setItems(newItems);
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const data = {
        name: productForm.name,
        price: productForm.price !== '' ? parseFloat(productForm.price) : null,
      };
      const res = await api.post('/products', data);
      setProducts((prev) => [res.data, ...prev]);
      if (productModalCallback != null) {
        const newItems = [...items];
        newItems[productModalCallback].product_id = res.data.id;
        newItems[productModalCallback].unit_price = res.data.price != null ? res.data.price : '';
        setItems(newItems);
      }
      setShowProductModal(false);
      toast.success('Produit créé');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_id: null, item_date: '', quantity: 1, unit_price: '' }]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const handleSubmit = async () => {
    if (!selectedClientId) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    const validItems = items.filter((item) => item.product_id && item.unit_price !== '');
    if (validItems.length === 0) {
      toast.error('Ajoutez au moins un produit avec un prix');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        client_id: selectedClientId,
        type: invoiceType,
        items: validItems.map((item) => ({
          product_id: item.product_id,
          item_date: item.item_date || null,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      };

      if (isEditMode) {
        await api.put(`/invoices/${id}`, payload);
        toast.success('Facture mise à jour avec succès');
      } else {
        await api.post('/invoices', payload);
        toast.success('Facture créée avec succès');
      }
      navigate('/invoices');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const getProductName = (productId) => {
    const p = products.find((pr) => pr.id === productId);
    return p ? p.name : '';
  };

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">
          {isEditMode ? 'Modifier la Facture' : 'Nouvelle Facture'}
        </h2>
        <button
          onClick={() => navigate('/invoices')}
          className="px-4 py-2.5 text-sm border border-[#e5e5e5] hover:bg-gray-50 transition-colors rounded-lg"
        >
          Annuler
        </button>
      </div>

      {/* Invoice Type Toggle (only for new invoices) */}
      {!isEditMode && (
        <div className="bg-white border border-[#e5e5e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4 md:p-6 mb-4 md:mb-6 rounded-xl">
          <h3 className="text-sm font-bold uppercase tracking-wide mb-4 text-gray-500">
            Type de document
          </h3>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="invoiceType"
                value="invoice"
                checked={invoiceType === 'invoice'}
                onChange={(e) => setInvoiceType(e.target.value)}
                className="w-4 h-4 text-black focus:ring-black"
              />
              <span className="text-sm font-medium">Facture</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="invoiceType"
                value="proforma"
                checked={invoiceType === 'proforma'}
                onChange={(e) => setInvoiceType(e.target.value)}
                className="w-4 h-4 text-black focus:ring-black"
              />
              <span className="text-sm font-medium">Proforma</span>
            </label>
          </div>
        </div>
      )}

      {/* Step 1: Client */}
      <div className="bg-white border border-[#e5e5e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4 md:p-6 mb-4 md:mb-6 rounded-xl">
        <h3 className="text-sm font-bold uppercase tracking-wide mb-4 text-gray-500">
          1. Client
        </h3>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3">
          <div className="flex-1">
            <SearchableSelect
              options={clientOptions}
              value={selectedClientId}
              onChange={(val) => setSelectedClientId(val)}
              placeholder="Sélectionner un client..."
              onCreate={(name) => {
                setClientForm({ name, phone: '', birthday: '', notes: '' });
                setShowClientModal(true);
              }}
            />
          </div>
          <button
            onClick={() => {
              setClientForm({ name: '', phone: '', birthday: '', notes: '' });
              setShowClientModal(true);
            }}
            className="px-4 py-2.5 bg-black text-white text-sm font-medium hover:bg-[#333] transition-colors whitespace-nowrap rounded-lg"
          >
            Nouveau client
          </button>
        </div>
        {selectedClient && (
          <div className="mt-3 text-sm text-gray-600">
            Client sélectionné : <span className="font-medium text-black">{selectedClient.name}</span>
            {selectedClient.phone && <span className="ml-2">— {selectedClient.phone}</span>}
          </div>
        )}
      </div>

      {/* Step 2: Line Items */}
      <div className="bg-white border border-[#e5e5e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4 md:p-6 mb-4 md:mb-6 rounded-xl">
        <h3 className="text-sm font-bold uppercase tracking-wide mb-4 text-gray-500">
          2. Articles
        </h3>

        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-12 gap-3 text-xs font-medium text-gray-500 uppercase tracking-wide px-1 mb-2">
          <div className="col-span-4">Produit</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Quantité</div>
          <div className="col-span-2">Prix unit. (USD)</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1"></div>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index}>
              {/* Desktop row */}
              <div className="hidden md:grid grid-cols-12 gap-3 items-start">
                <div className="col-span-4">
                  <div className="flex gap-1">
                    <div className="flex-1">
                      <SearchableSelect
                        options={productOptions}
                        value={item.product_id}
                        onChange={(val) => selectProduct(index, val)}
                        placeholder="Sélectionner un produit..."
                        onCreate={(name) => {
                          setProductForm({ name, price: '' });
                          setProductModalCallback(index);
                          setShowProductModal(true);
                        }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        setProductForm({ name: '', price: '' });
                        setProductModalCallback(index);
                        setShowProductModal(true);
                      }}
                      className="px-2.5 py-2.5 bg-black text-white text-xs hover:bg-[#333] transition-colors rounded-lg"
                      title="Nouveau produit"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="col-span-2">
                  <input
                    type="date"
                    value={item.item_date}
                    onChange={(e) => updateItem(index, 'item_date', e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg"
                  />
                </div>
                <div className="col-span-1 text-right py-2.5 text-sm font-medium">
                  {item.unit_price !== ''
                    ? formatUSD((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))
                    : '—'}
                </div>
                <div className="col-span-1 text-center">
                  <button
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="py-2.5 px-2 text-gray-400 hover:text-black disabled:opacity-30 text-lg"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Mobile card */}
              <div className="md:hidden bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase">Article {index + 1}</span>
                  <button
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="text-gray-400 hover:text-black disabled:opacity-30 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
                <div className="mb-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={productOptions}
                        value={item.product_id}
                        onChange={(val) => selectProduct(index, val)}
                        placeholder="Sélectionner un produit..."
                        onCreate={(name) => {
                          setProductForm({ name, price: '' });
                          setProductModalCallback(index);
                          setShowProductModal(true);
                        }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        setProductForm({ name: '', price: '' });
                        setProductModalCallback(index);
                        setShowProductModal(true);
                      }}
                      className="px-3 py-2.5 bg-black text-white text-xs hover:bg-[#333] transition-colors rounded-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={item.item_date}
                    onChange={(e) => updateItem(index, 'item_date', e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Quantité</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Prix unit. (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg"
                    />
                  </div>
                </div>
                <div className="text-right text-sm font-medium">
                  Total : {item.unit_price !== ''
                    ? formatUSD((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))
                    : '—'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addItem}
          className="mt-4 px-4 py-2.5 text-sm border border-[#e5e5e5] hover:bg-gray-50 transition-colors rounded-lg"
        >
          Ajouter un produit
        </button>

        {/* Total */}
        <div className="mt-6 pt-4 border-t border-[#e5e5e5] flex justify-end">
          <div className="text-right">
            <span className="text-sm text-gray-500 mr-4">TOTAL</span>
            <span className="text-2xl font-bold">{formatUSD(total)}</span>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
        <button
          onClick={() => navigate('/invoices')}
          className="px-6 py-2.5 text-sm border border-[#e5e5e5] hover:bg-gray-50 transition-colors rounded-lg"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-6 py-2.5 bg-black text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50 rounded-lg"
        >
          {submitting
            ? 'Génération...'
            : isEditMode
              ? 'Mettre à jour'
              : 'Générer la Facture'}
        </button>
      </div>

      {/* Client Modal */}
      {showClientModal && (
        <>
          {/* Desktop */}
          <div className="hidden md:flex fixed inset-0 bg-black/30 items-center justify-center z-50">
            <div className="bg-white border border-[#e5e5e5] shadow-lg p-6 w-full max-w-md rounded-xl">
              <h3 className="text-lg font-bold mb-4">Nouveau client</h3>
              <form onSubmit={handleCreateClient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input type="text" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone</label>
                  <input type="text" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date de naissance</label>
                  <input type="date" value={clientForm.birthday} onChange={(e) => setClientForm({ ...clientForm, birthday: e.target.value })} className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg" rows={3} />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setShowClientModal(false)} className="px-4 py-2.5 text-sm border border-[#e5e5e5] hover:bg-gray-50 transition-colors rounded-lg">Annuler</button>
                  <button type="submit" className="px-4 py-2.5 bg-black text-white text-sm font-medium hover:bg-[#333] transition-colors rounded-lg">Créer</button>
                </div>
              </form>
            </div>
          </div>
          {/* Mobile bottom sheet */}
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowClientModal(false)} />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[85vh] overflow-auto">
              <div className="flex justify-center mb-4"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
              <h3 className="text-lg font-bold mb-4">Nouveau client</h3>
              <form onSubmit={handleCreateClient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input type="text" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone</label>
                  <input type="text" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date de naissance</label>
                  <input type="date" value={clientForm.birthday} onChange={(e) => setClientForm({ ...clientForm, birthday: e.target.value })} className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg" rows={3} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowClientModal(false)} className="flex-1 py-2.5 text-sm border border-[#e5e5e5] hover:bg-gray-50 transition-colors rounded-lg">Annuler</button>
                  <button type="submit" className="flex-1 py-2.5 bg-black text-white text-sm font-medium hover:bg-[#333] transition-colors rounded-lg">Créer</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <>
          {/* Desktop */}
          <div className="hidden md:flex fixed inset-0 bg-black/30 items-center justify-center z-50">
            <div className="bg-white border border-[#e5e5e5] shadow-lg p-6 w-full max-w-md rounded-xl">
              <h3 className="text-lg font-bold mb-4">Nouveau produit</h3>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input type="text" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prix (USD) <span className="text-gray-400 font-normal">— laisser vide = prix à définir</span></label>
                  <input type="number" step="0.01" min="0" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg" placeholder="0.00" />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setShowProductModal(false)} className="px-4 py-2.5 text-sm border border-[#e5e5e5] hover:bg-gray-50 transition-colors rounded-lg">Annuler</button>
                  <button type="submit" className="px-4 py-2.5 bg-black text-white text-sm font-medium hover:bg-[#333] transition-colors rounded-lg">Créer</button>
                </div>
              </form>
            </div>
          </div>
          {/* Mobile bottom sheet */}
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowProductModal(false)} />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6">
              <div className="flex justify-center mb-4"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
              <h3 className="text-lg font-bold mb-4">Nouveau produit</h3>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input type="text" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prix (USD) <span className="text-gray-400 font-normal">— laisser vide = prix à définir</span></label>
                  <input type="number" step="0.01" min="0" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm rounded-lg" placeholder="0.00" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowProductModal(false)} className="flex-1 py-2.5 text-sm border border-[#e5e5e5] hover:bg-gray-50 transition-colors rounded-lg">Annuler</button>
                  <button type="submit" className="flex-1 py-2.5 bg-black text-white text-sm font-medium hover:bg-[#333] transition-colors rounded-lg">Créer</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
