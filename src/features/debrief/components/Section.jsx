import { memo } from 'react';

function Section({ number, title, children }) {
  return (
    <section className="card">
      <div className="section-heading">
        <span className="section-number">{number}</span>
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="section-content">{children}</div>
    </section>
  );
}

export default memo(Section);
