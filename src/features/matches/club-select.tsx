'use client';
import { useId, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { TeamIdentity } from '@/components/team-identity';
import { clubKey, searchClubs, type Club } from '@/domain/clubs';

export function ClubSelect({
  label,
  name,
  value,
  clubs,
  placeholder,
  onType,
  onPick,
}: {
  label: string;
  name: string;
  value: string;
  clubs: Club[];
  placeholder: string;
  onType: (value: string) => void;
  onPick: (club: Club) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false),
    [searching, setSearching] = useState(false),
    [active, setActive] = useState(-1);
  // The whole list shows on opening; it is only filtered once the user types.
  const found = searching ? searchClubs(clubs, value) : clubs;
  const isNew = !!value.trim() && !clubs.some((club) => clubKey(club.name) === clubKey(value));
  const expanded = open && (found.length > 0 || (searching && isNew));
  function show() {
    if (open) return;
    setOpen(true);
    setSearching(false);
    setActive(-1);
  }
  function pick(club: Club) {
    onPick(club);
    setOpen(false);
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!expanded) return show();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next = Math.max(0, Math.min(found.length - 1, active + step));
      setActive(next);
      document.getElementById(`${id}-${next}`)?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && expanded) {
      event.preventDefault();
      if (found[active]) pick(found[active]);
      else setOpen(false);
    } else if (event.key === 'Escape' && expanded) {
      event.preventDefault();
      setOpen(false);
    }
  }
  return (
    <div
      className="club-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="club-select-control">
        <span className="club-select-icon" aria-hidden="true">
          <TeamIdentity
            name={value}
            logoId={clubs.find((club) => clubKey(club.name) === clubKey(value))?.logoId}
          />
        </span>
        <input
          id={id}
          name={name}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={expanded && found[active] ? `${id}-${active}` : undefined}
          value={value}
          autoComplete="off"
          maxLength={100}
          required
          placeholder={placeholder}
          onClick={show}
          onKeyDown={keyDown}
          onChange={(event) => {
            onType(event.target.value);
            setOpen(true);
            setSearching(true);
            setActive(-1);
          }}
        />
        <button
          type="button"
          className="club-select-toggle"
          tabIndex={-1}
          aria-label="Afficher les clubs"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (open ? setOpen(false) : show())}
        >
          <ChevronDown size={18} />
        </button>
      </div>
      {expanded && (
        // Keeps the focus in the field while an option is clicked.
        <ul id={`${id}-list`} role="listbox" onMouseDown={(event) => event.preventDefault()}>
          {found.map((club, index) => (
            <li
              key={clubKey(club.name)}
              id={`${id}-${index}`}
              role="option"
              aria-selected={index === active}
              onClick={() => pick(club)}
            >
              <TeamIdentity name={club.name} logoId={club.logoId} />
            </li>
          ))}
          {searching && isNew && (
            <li role="option" aria-selected={false} onClick={() => setOpen(false)}>
              <span className="club-select-new">
                <Plus size={16} aria-hidden="true" /> Nouveau club « {value.trim()} »
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
