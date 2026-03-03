import { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({ options, value, onChange, placeholder, onCreate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = options.some(
    (o) => o.label.toLowerCase() === search.toLowerCase()
  );

  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearch('');
  };

  const handleKeyDown = (e) => {
    const totalItems = filtered.length + (onCreate && search && !exactMatch ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex < filtered.length) {
        handleSelect(filtered[highlightIndex]);
      } else if (onCreate && search && !exactMatch) {
        onCreate(search);
        setIsOpen(false);
        setSearch('');
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[highlightIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:border-black focus:outline-none text-sm text-left rounded-lg bg-white min-h-[42px]"
      >
        {selectedOption ? (
          <span>{selectedOption.label}</span>
        ) : (
          <span className="text-gray-400">{placeholder || 'Sélectionner...'}</span>
        )}
      </button>

      {/* Dropdown panel — desktop: absolute dropdown, mobile: bottom sheet */}
      {isOpen && (
        <>
          {/* Mobile overlay */}
          <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => { setIsOpen(false); setSearch(''); }} />

          {/* Desktop dropdown */}
          <div className="hidden md:block absolute z-50 w-full mt-1 bg-white border border-[#e5e5e5] rounded-xl shadow-lg overflow-hidden">
            <div className="p-2 border-b border-[#e5e5e5]">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher..."
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:border-black focus:outline-none text-sm"
              />
            </div>
            <div ref={listRef} className="max-h-52 overflow-auto">
              {filtered.length === 0 && !(onCreate && search && !exactMatch) && (
                <div className="px-3 py-3 text-sm text-gray-400 text-center">Aucun résultat</div>
              )}
              {filtered.map((option, i) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                    i === highlightIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                  } ${option.value === value ? 'font-medium' : ''}`}
                >
                  {option.label}
                </button>
              ))}
              {onCreate && search && !exactMatch && (
                <button
                  type="button"
                  onClick={() => {
                    onCreate(search);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-3 py-2.5 text-sm font-medium border-t border-[#e5e5e5] transition-colors ${
                    highlightIndex === filtered.length ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  + Créer : {search}
                </button>
              )}
            </div>
          </div>

          {/* Mobile bottom sheet */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="p-3 border-b border-[#e5e5e5]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher..."
                className="w-full px-3 py-2.5 border border-[#e5e5e5] rounded-lg focus:border-black focus:outline-none text-sm"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-auto">
              {filtered.length === 0 && !(onCreate && search && !exactMatch) && (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">Aucun résultat</div>
              )}
              {filtered.map((option, i) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-4 py-3.5 text-sm border-b border-[#f0f0f0] transition-colors ${
                    option.value === value ? 'font-medium bg-gray-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              {onCreate && search && !exactMatch && (
                <button
                  type="button"
                  onClick={() => {
                    onCreate(search);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full text-left px-4 py-3.5 text-sm font-medium border-t border-[#e5e5e5] hover:bg-gray-50"
                >
                  + Créer : {search}
                </button>
              )}
            </div>
            <div className="p-3 border-t border-[#e5e5e5]">
              <button
                type="button"
                onClick={() => { setIsOpen(false); setSearch(''); }}
                className="w-full py-2.5 text-sm font-medium bg-gray-100 rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
