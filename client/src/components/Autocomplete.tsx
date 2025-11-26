
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  subLabel?: string;
  score?: number;
}

interface AutocompleteProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onCreate: (query: string) => void;
  placeholder?: string;
  className?: string;
}

// Helper: Calculate Levenshtein distance for fuzzy matching
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
          matrix[i - 1][j - 1], // substitution
          matrix[i][j - 1],     // insertion
          matrix[i - 1][j]      // deletion
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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync query with selected value label
  useEffect(() => {
    const selected = options.find(o => o.id === value);
    if (selected) {
      setQuery(selected.label);
    } else if (!value) {
      setQuery('');
    }
  }, [value, options]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Revert query to currently selected value if no change was made
        const selected = options.find(o => o.id === value);
        if (selected) {
            setQuery(selected.label);
        } else if (value === '') {
            setQuery('');
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, value, options]);

  // Advanced Filtering with Fuzzy Search
  const filteredOptions = useMemo(() => {
    if (!query) return options;

    const lowerQuery = query.toLowerCase().trim();
    const minLen = lowerQuery.length;
    // Allow more errors for longer queries
    const maxErrors = minLen > 5 ? 2 : minLen > 2 ? 1 : 0;

    return options
      .map((option) => {
        const label = option.label;
        const lowerLabel = label.toLowerCase();
        const subLabel = option.subLabel || '';
        const lowerSub = subLabel.toLowerCase();

        let score = 0;

        // 1. Exact Match (Highest Priority)
        if (lowerLabel === lowerQuery) {
          score = 100;
        } 
        // 2. Starts With
        else if (lowerLabel.startsWith(lowerQuery)) {
          score = 80;
        }
        // 3. Word Starts With (e.g. "Mouse" matches "Wireless Mouse")
        else if (lowerLabel.split(/[\s-]+/).some(word => word.startsWith(lowerQuery))) {
          score = 70;
        }
        // 4. Contains
        else if (lowerLabel.includes(lowerQuery)) {
          score = 60;
        }
        else if (lowerSub.includes(lowerQuery)) {
          score = 50;
        }
        // 5. Fuzzy Match (Levenshtein)
        else {
          // Check whole string distance
          const dist = levenshtein(lowerQuery, lowerLabel);
          if (dist <= maxErrors) {
            score = 40 - dist;
          } else {
            // Check individual words for fuzzy match
            const words = lowerLabel.split(/[\s-]+/);
            for (const word of words) {
               const wordDist = levenshtein(lowerQuery, word);
               if (wordDist <= maxErrors) {
                   score = Math.max(score, 35 - wordDist);
               }
            }
            // Check subLabel words
             if (subLabel) {
                const subWords = lowerSub.split(/[\s-]+/);
                for (const word of subWords) {
                    const wordDist = levenshtein(lowerQuery, word);
                    if (wordDist <= maxErrors) {
                        score = Math.max(score, 30 - wordDist);
                    }
                }
             }
          }
        }

        return { ...option, score };
      })
      .filter((opt) => opt.score > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0));

  }, [query, options]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          className="w-full rounded-md border border-slate-300 p-2 pl-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            // Only clear if user manually clears. 
            // Note: Logic depends on UX preference. Often clearing text clears value.
            if (e.target.value === '') onChange('');
          }}
          onFocus={() => setIsOpen(true)}
        />
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-50 last:border-0"
              >
                <div className="font-medium text-slate-800">
                  {option.label}
                  {/* Debug score: <span className='text-xs text-gray-300 ml-2'>({option.score})</span> */}
                </div>
                {option.subLabel && <div className="text-xs text-slate-500">{option.subLabel}</div>}
              </button>
            ))
          ) : (
            <div className="p-2">
                <p className="text-xs text-gray-500 px-2 py-1">No results found.</p>
                <button
                    type="button"
                    onClick={() => {
                        onCreate(query);
                        setIsOpen(false);
                    }}
                    className="w-full text-left px-2 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded flex items-center gap-2 font-medium"
                >
                    <Plus className="w-4 h-4" /> Create "{query}"
                </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Autocomplete;
