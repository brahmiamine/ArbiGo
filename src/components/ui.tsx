'use client';
import { useEffect, useId, useRef, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { X, ArrowUpRight, Check, AlertTriangle } from 'lucide-react';
export function PageHeader({
  title,
  meta,
  children,
}: {
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading compact-heading">
      <div>
        <h1>{title}</h1>
        {meta && <p>{meta}</p>}
      </div>
      {children}
    </header>
  );
}
export function Button({
  children,
  variant = 'primary',
  className = '',
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button {...p} className={`button ${variant} ${className}`}>
      {children}
    </button>
  );
}
export function Badge({
  children,
  tone = 'blue',
}: {
  children: ReactNode;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'gray';
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    heading = useId();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={heading}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2 id={heading}>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Fermer">
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <ArrowUpRight />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Notice({
  children,
  tone = 'amber',
}: {
  children: ReactNode;
  tone?: 'amber' | 'green';
}) {
  return (
    <div className={`notice ${tone}`}>
      {tone === 'amber' ? <AlertTriangle size={18} /> : <Check size={18} />}
      <div>{children}</div>
    </div>
  );
}
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
