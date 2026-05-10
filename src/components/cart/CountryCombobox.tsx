"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { COUNTRIES, countryNameFromCode, normaliseCountryCode, type CountryOption } from "@/lib/countries";

type CountryComboboxProps = {
  valueCode: string;
  valueName?: string;
  onChange: (country: CountryOption) => void;
  onInvalidInput?: () => void;
  required?: boolean;
  error?: string | null;
};

const MAX_VISIBLE_RESULTS = 80;

function matchesCountry(country: CountryOption, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return country.name.toLowerCase().includes(q) || country.code.toLowerCase().includes(q);
}

export default function CountryCombobox({ valueCode, valueName, onChange, onInvalidInput, required = false, error }: CountryComboboxProps) {
  const id = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedName = countryNameFromCode(valueCode, valueName || "");
  const [inputValue, setInputValue] = useState(selectedName);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const next = countryNameFromCode(valueCode, valueName || "");
    setInputValue(next);
  }, [valueCode, valueName]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current || wrapperRef.current.contains(event.target as Node)) return;
      setOpen(false);
      validateOrRestore();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, valueCode]);

  const filtered = useMemo(() => COUNTRIES.filter((country) => matchesCountry(country, inputValue)).slice(0, MAX_VISIBLE_RESULTS), [inputValue]);
  const showError = Boolean(error || (touched && required && !normaliseCountryCode(valueCode)));

  function selectCountry(country: CountryOption) {
    onChange(country);
    setInputValue(country.name);
    setOpen(false);
    setTouched(true);
    setActiveIndex(0);
  }

  function validateOrRestore() {
    const matchedCode = normaliseCountryCode(inputValue);
    const matched = matchedCode ? COUNTRIES.find((country) => country.code === matchedCode) : null;
    if (matched) {
      selectCountry(matched);
      return;
    }
    const currentName = countryNameFromCode(valueCode, "");
    if (currentName) {
      setInputValue(currentName);
    } else {
      setInputValue("");
      onInvalidInput?.();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      if (open && filtered[activeIndex]) {
        event.preventDefault();
        selectCountry(filtered[activeIndex]);
      }
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      validateOrRestore();
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label htmlFor={id} className="label">Country *</label>
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-invalid={showError}
          aria-describedby={showError ? `${id}-error` : undefined}
          required={required}
          className={`input py-2 pr-9 text-sm ${showError ? "border-red-300 ring-1 ring-red-200" : ""}`}
          value={inputValue}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTouched(true);
            window.setTimeout(validateOrRestore, 120);
          }}
          onChange={(event) => {
            setInputValue(event.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          placeholder="Search country, e.g. United Kingdom"
        />
        <button
          type="button"
          aria-label="Show countries"
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-gray-400 hover:text-navy-950"
          onClick={() => setOpen((current) => !current)}
        >
          ▾
        </button>
      </div>
      {open ? (
        <div id={`${id}-listbox`} role="listbox" className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-xl">
          {filtered.length ? filtered.map((country, index) => (
            <button
              key={country.code}
              type="button"
              role="option"
              aria-selected={country.code === normaliseCountryCode(valueCode)}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50 ${index === activeIndex ? "bg-blue-50 text-navy-950" : "text-gray-700"}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectCountry(country)}
            >
              <span className="truncate font-800">{country.name}</span>
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{country.code}</span>
            </button>
          )) : <div className="px-3 py-3 text-xs text-red-600">No matching country. Select a country from the list.</div>}
        </div>
      ) : null}
      <p className="mt-1 text-[11px] text-gray-400">Start typing to search. The selected country is stored as an ISO country code for accurate shipping calculation.</p>
      {showError ? <p id={`${id}-error`} className="mt-1 text-xs font-800 text-red-600">{error || "Select a valid country from the dropdown."}</p> : null}
    </div>
  );
}
