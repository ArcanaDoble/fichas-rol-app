import React, { useMemo, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import Input from './Input';

const normalizeWord = (word) => (word || '').trim().toLowerCase();

const clampCount = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(value, 20));
};

const TraitsInput = ({
  value,
  onChange,
  glossary = [],
  placeholder = 'Rasgos (separados por comas)',
  className = '',
}) => {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const currentSearch = useMemo(() => {
    if (!value) return '';
    const parts = value.split(',');
    if (parts.length === 0) return '';
    return parts[parts.length - 1].trim().toLowerCase();
  }, [value]);

  const selectedTraits = useMemo(() => {
    if (!value) return [];
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.toLowerCase());
  }, [value]);

  const suggestions = useMemo(() => {
    if (!currentSearch) return [];

    const seen = new Set();
    const normalizedSearch = currentSearch
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const normalizeForCompare = (word) =>
      word
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const words = glossary
      .map((term) => term?.word)
      .filter(Boolean)
      .filter((word) => !selectedTraits.includes(normalizeWord(word)));

    const filtered = words
      .map((word) => ({
        word,
        normalized: normalizeForCompare(word),
      }))
      .filter(({ normalized }) => normalized.includes(normalizedSearch));

    filtered.sort((a, b) => {
      const indexA = a.normalized.indexOf(normalizedSearch);
      const indexB = b.normalized.indexOf(normalizedSearch);
      if (indexA !== indexB) return indexA - indexB;
      return a.word.localeCompare(b.word, undefined, { sensitivity: 'base' });
    });

    const uniqueOrdered = [];
    filtered.forEach(({ word }) => {
      if (seen.has(word)) return;
      seen.add(word);
      uniqueOrdered.push(word);
    });

    return uniqueOrdered.slice(0, clampCount(10));
  }, [currentSearch, glossary, selectedTraits]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions.length]);

  const applySuggestion = (suggestion) => {
    if (!suggestion) return;
    const parts = value ? value.split(',') : [''];
    const baseParts = parts.slice(0, -1).map((part) => part.trim()).filter(Boolean);
    if (!baseParts.includes(suggestion)) {
      baseParts.push(suggestion);
    }
    const newValue = `${baseParts.join(', ')}${baseParts.length > 0 ? ', ' : ''}`;
    onChange(newValue);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleKeyDown = (event) => {
    if (!isFocused || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (event.key === 'Tab' || event.key === 'Enter') {
      const suggestion = suggestions[highlightedIndex];
      if (suggestion) {
        event.preventDefault();
        applySuggestion(suggestion);
      }
    }

    if (event.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const showSuggestions = isFocused && suggestions.length > 0;

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          window.setTimeout(() => setIsFocused(false), 100);
        }}
        onKeyDown={handleKeyDown}
        className={className}
      />
      {showSuggestions && (
        <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-md border border-gray-700 bg-gray-800 shadow-lg">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                index === highlightedIndex
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-200 hover:bg-gray-700/60'
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                applySuggestion(suggestion);
              }}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

TraitsInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  glossary: PropTypes.arrayOf(
    PropTypes.shape({
      word: PropTypes.string,
    }),
  ),
  placeholder: PropTypes.string,
  className: PropTypes.string,
};

export default TraitsInput;
