import { memo } from 'react';

function Section({ number, icon, title, subtitle, children }) {
  return (
    <section className="card">
      <div className="section-heading">
        <span className="section-number">{number}</span>
        <span className="section-icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="section-content">{children}</div>
    </section>
  );
}

export default memo(Section);
