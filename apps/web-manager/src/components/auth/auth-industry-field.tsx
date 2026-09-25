'use client';

import {
  BUSINESS_INDUSTRY_LABELS,
  BUSINESS_INDUSTRY_OPTIONS,
  type BusinessIndustry,
} from '@eveider/domain';
import { IconChevronDown, IconSearch } from '@eveider/ui';
import { useEffect, useId, useRef, useState } from 'react';
import styles from './auth-shell.module.css';

type AuthIndustryFieldProps = {
  value: string;
  onChange: (industry: string) => void;
  required?: boolean;
};

function normalizeQuery(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesIndustry(industry: BusinessIndustry, query: string): boolean {
  if (!query) return true;
  const needle = normalizeQuery(query);
  return (
    normalizeQuery(industry).includes(needle) ||
    normalizeQuery(BUSINESS_INDUSTRY_LABELS[industry]).includes(needle)
  );
}

export function AuthIndustryField({ value, onChange, required }: AuthIndustryFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selectedLabel =
    value in BUSINESS_INDUSTRY_LABELS
      ? BUSINESS_INDUSTRY_LABELS[value as BusinessIndustry]
      : value;

  const filtered = BUSINESS_INDUSTRY_OPTIONS.filter((option) => matchesIndustry(option, query));

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
  }, [open]);

  return (
    <div className={styles.field} ref={rootRef}>
      <span>Secteur d’activité</span>
      <div className={styles.industrySelect}>
        <button
          type="button"
          className={styles.industryTrigger}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            setOpen((current) => !current);
            setQuery('');
          }}
        >
          <span className={styles.industryTriggerLabel}>{selectedLabel || 'Choisir un secteur'}</span>
          <IconChevronDown width={18} height={18} aria-hidden />
        </button>
        {required ? (
          <input
            className={styles.industryRequired}
            tabIndex={-1}
            aria-hidden
            required
            value={value}
            onChange={() => undefined}
          />
        ) : null}
        {open ? (
          <div className={styles.industryPanel} role="presentation">
            <div className={styles.industrySearch}>
              <IconSearch width={16} height={16} aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un secteur…"
                aria-label="Rechercher un secteur d’activité"
                autoComplete="off"
              />
            </div>
            <ul id={listId} className={styles.industryList} role="listbox" aria-label="Secteurs d’activité">
              {filtered.length === 0 ? (
                <li className={styles.industryEmpty}>Aucun secteur trouvé</li>
              ) : (
                filtered.map((option) => {
                  const selected = option === value;
                  return (
                    <li key={option} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={selected ? styles.industryOptionSelected : styles.industryOption}
                        onClick={() => {
                          onChange(option);
                          setOpen(false);
                          setQuery('');
                        }}
                      >
                        {BUSINESS_INDUSTRY_LABELS[option]}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
