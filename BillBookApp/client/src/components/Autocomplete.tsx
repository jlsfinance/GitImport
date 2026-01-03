import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, User, Plus, ChevronRight, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContactsService } from '@/services/contactsService';
import { HapticService } from '@/services/hapticService';

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
  onContactSelect?: (name: string, phone: string) => void;
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
  const [contactSuggestions, setContactSuggestions] = useState<{ name: string; phone: string }[]>([]);
  const [showContacts, setShowContacts] = useState(false);

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
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-google-blue transition-colors">
          {type === 'customer' ? <User className="w-5 h-5" /> : <Package className="w-5 h-5" />}
        </div>
        <input
          type="text"
          className="w-full bg-surface-container-high border-2 border-transparent focus:border-google-blue/50 rounded-[28px] py-4 pl-14 pr-12 text-sm font-bold text-foreground placeholder:text-muted-foreground outline-none transition-all shadow-sm group-focus-within:shadow-google focus:ring-4 focus:ring-google-blue/10"
          placeholder={placeholder}
          value={query}
          onChange={async (e) => {
            const val = e.target.value;
            setQuery(val);
            setIsOpen(true);
            if (val === '') onChange('');

            if (type === 'customer' && val.length >= 2) {
              const results = await ContactsService.searchContacts(val);
              // Filter out contacts that are already in options (matched by phone if possible)
              const filteredContacts = results.filter(contact =>
                !options.some(opt => opt.subLabel?.includes(contact.phone.replace(/\D/g, '').slice(-10)))
              );
              setContactSuggestions(filteredContacts);
              setShowContacts(filteredContacts.length > 0);
            } else {
              setShowContacts(false);
            }
          }}
          onFocus={async () => {
            setIsOpen(true);
            if (type === 'customer') {
              const hasPerm = await ContactsService.checkPermission();
              if (!hasPerm && query.length > 0) {
                // Not asking permission on just focus to avoid being annoying, 
                // but we could if we want. Let's wait for typing.
              }
            }
          }}
          onKeyDown={handleKeyDownLocal}
          ref={inputRef}
          autoFocus={autoFocus}
        />
        <div className="absolute right-5 top-1/2 -translate-y-1/2">
          <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-google-blue transition-colors" />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98, y: 12 }}
            className="absolute z-[110] left-0 right-0 mt-3 bg-surface-container-highest backdrop-blur-2xl border border-border rounded-[32px] shadow-google-lg overflow-hidden p-2"
          >
            <div className="max-h-[320px] overflow-y-auto space-y-1 no-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className={`w-full text-left p-4 rounded-[24px] flex items-center gap-4 transition-all relative group/item ${activeIndex === idx || value === option.id
                      ? 'bg-google-blue text-white shadow-google'
                      : 'hover:bg-surface-container-high text-foreground'
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${activeIndex === idx || value === option.id
                      ? 'bg-white/20'
                      : 'bg-surface-container-highest border border-border'
                      }`}>
                      {type === 'customer' ? <User className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate text-sm tracking-tight">{option.label}</div>
                      {option.subLabel && (
                        <div className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${activeIndex === idx || value === option.id ? 'opacity-70' : 'text-muted-foreground'
                          }`}>
                          {option.subLabel}
                        </div>
                      )}
                    </div>
                    <ChevronRight className={`w-5 h-5 transition-transform group-hover/item:translate-x-1 ${activeIndex === idx || value === option.id ? 'opacity-70' : 'text-muted-foreground/30'
                      }`} />
                  </button>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm font-bold text-muted-foreground italic">No matches found</p>
                </div>
              )}

              {query && onCreate && !options.some(o => o.label.toLowerCase() === query.trim().toLowerCase()) && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="px-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Add Custom</p>
                  <button
                    type="button"
                    onClick={() => {
                      onCreate(query);
                      setIsOpen(false);
                      HapticService.medium();
                    }}
                    className="w-full text-left p-4 rounded-[24px] flex items-center gap-4 text-google-blue bg-google-blue/10 hover:bg-google-blue/20 transition-all group/create border border-google-blue/10"
                  >
                    <div className="w-12 h-12 rounded-full bg-google-blue/20 flex items-center justify-center group-hover/create:scale-110 transition-transform">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-xs uppercase tracking-widest opacity-70">Add New Party</div>
                      <div className="text-sm font-black text-foreground">"{query}"</div>
                    </div>
                  </button>
                </div>
              )}

              {/* Contacts Selection */}
              {type === 'customer' && showContacts && contactSuggestions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="px-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Found in Phone Contacts</p>
                  <div className="space-y-1">
                    {contactSuggestions.map((contact, i) => (
                      <button
                        key={`contact-${i}`}
                        type="button"
                        onClick={() => {
                          if (onCreate) {
                            // This will typically trigger the parent's creation logic
                            // but we might want to pass name and phone
                            onCreate(`${contact.name}|${contact.phone.replace(/\D/g, '').slice(-10)}`);
                          }
                          setIsOpen(false);
                          HapticService.success();
                        }}
                        className="w-full text-left p-3 rounded-[24px] flex items-center gap-4 hover:bg-google-blue/5 transition-all group/contact"
                      >
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-xs shrink-0">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">{contact.name}</div>
                          <div className="text-[10px] font-bold text-muted-foreground">{contact.phone}</div>
                        </div>
                        <Plus className="w-4 h-4 text-indigo-500 opacity-30 group-hover/contact:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
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
