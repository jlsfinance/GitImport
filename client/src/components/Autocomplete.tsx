import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, User, Package, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  id: string;
  label: string;
  subLabel?: string;
  score?: number;
}

interface AutocompleteProps {
  options: Option[];
  value: string | null;
  onChange: (value: string) => void;
  onCreate?: (query: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  autoFocus?: boolean;
  type?: 'customer' | 'product';
}

const levenshtein = (a: string, b: string): number => {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = new Array<number[]>(bn + 1);
  for (let i = 0; i <= bn; ++i) {
    let row = matrix[i] = new Array<number>(an + 1);
    row[0] = i;
  }
  const firstRow = matrix[0];
  for (let j = 1; j <= an; ++j) {
    firstRow[j] = j;
  }
  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1],
          matrix[i][j - 1],
          matrix[i - 1][j]
        ) + 1;
      }
    }
  }
  return matrix[bn][an];
};

const Autocomplete: React.FC<AutocompleteProps> = ({
  options,
  value,
  onChange,
  onCreate,
  placeholder = "Search...",
  className = "",
  onKeyDown,
  inputRef,
  autoFocus,
  type = 'customer'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const selected = options.find(o => o.id === value);
    if (selected) {
      setQuery(selected.label);
    } else if (!value) {
      setQuery('');
    }
  }, [value, options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        const selected = options.find(o => o.id === value);
        if (selected) {
          setQuery(selected.label);
        } else if (value === '' || value === null) {
          setQuery('');
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, value, options]);

  const filteredOptions = useMemo(() => {
    if (!query || (options.find(o => o.label === query) && !isOpen)) return options.slice(0, 10);

    const lowerQuery = query.toLowerCase().trim();
    const minLen = lowerQuery.length;
    const maxErrors = minLen > 5 ? 2 : minLen > 2 ? 1 : 0;

    return options
      .map((option) => {
        const label = option.label || '';
        const lowerLabel = label.toLowerCase();
        const subLabel = option.subLabel || '';
        const lowerSub = subLabel.toLowerCase();
        let score = 0;

        if (lowerLabel === lowerQuery) score = 100;
        else if (lowerLabel.startsWith(lowerQuery)) score = 80;
        else if (lowerLabel.split(/[\s-]+/).some(word => word.startsWith(lowerQuery))) score = 70;
        else if (lowerLabel.includes(lowerQuery)) score = 60;
        else if (lowerSub.includes(lowerQuery)) score = 50;
        else {
          const dist = levenshtein(lowerQuery, lowerLabel);
          if (dist <= maxErrors) score = 40 - dist;
        }

        return { ...option, score };
      })
      .filter((opt) => opt.score > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 8);
  }, [query, options, isOpen]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  const handleKeyDownLocal = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > -1 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        e.preventDefault();
        handleSelect(filteredOptions[activeIndex].id);
      } else if (query && onCreate && !options.some(o => o.label.toLowerCase() === query.trim().toLowerCase())) {
        e.preventDefault();
        onCreate(query);
        setIsOpen(false);
      } else if (onKeyDown) {
        onKeyDown(e);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (onKeyDown) {
      onKeyDown(e);
    }
  };

  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
          {type === 'customer' ? <User className="w-5 h-5" /> : <Package className="w-5 h-5" />}
        </div>
        <input
          type="text"
          className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-[20px] py-4 pl-12 pr-4 text-base font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-all shadow-sm group-focus-within:shadow-md"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (e.target.value === '') onChange('');
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDownLocal}
          ref={inputRef}
          autoFocus={autoFocus}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Search className="w-4 h-4 text-slate-300" />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute z-[110] left-0 right-0 mt-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-[24px] shadow-2xl overflow-hidden"
          >
            <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, idx) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${activeIndex === idx || value === option.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activeIndex === idx || value === option.id
                      ? 'bg-white/20'
                      : 'bg-slate-100 dark:bg-slate-700'
                      }`}>
                      {type === 'customer' ? <User className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate text-sm">{option.label}</div>
                      {option.subLabel && (
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${activeIndex === idx || value === option.id ? 'opacity-70' : 'text-slate-400'
                          }`}>
                          {option.subLabel}
                        </div>
                      )}
                    </div>
                    <ChevronRight className={`w-4 h-4 opacity-30 ${activeIndex === idx || value === option.id ? 'opacity-70' : ''}`} />
                  </button>
                ))
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm font-bold text-slate-400 italic">No matches found</p>
                </div>
              )}

              {query && onCreate && !options.some(o => o.label.toLowerCase() === query.trim().toLowerCase()) && (
                <div className="border-t border-slate-100 dark:border-slate-700/50 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onCreate(query);
                      setIsOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-xl flex items-center gap-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-sm uppercase">Create New</div>
                      <div className="text-xs font-bold opacity-70">"{query}"</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Autocomplete;
