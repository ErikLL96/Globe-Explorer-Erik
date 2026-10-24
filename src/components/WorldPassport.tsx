import { useId, useState } from 'react';
import { Info } from 'lucide-react';
import type { Destination } from '../domain/types';
import type { TravelStats } from '../domain/stats';
import { formatPercent } from '../domain/stats';
import { TOTAL_COUNTRIES } from '../domain/countries';
import { formatMonthYear } from '../utils/format';

interface WorldPassportProps {
  stats: TravelStats;
  latestVisited: Destination | null;
}

/** Two-letter ISO code for the stamp; regions without one fall back to their initials. */
function stampCode(d: Destination): string {
  return /^[A-Z]{2}$/.test(d.countryCode) ? d.countryCode : d.country.slice(0, 2).toUpperCase();
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  // Always show a sliver once you've started, so 1 country (0.5%) is visible.
  const shown = percent > 0 ? Math.max(percent, 1.5) : 0;
  return (
    <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle className="ring__track" cx="50" cy="50" r={radius} />
      <circle className="ring__ticks" cx="50" cy="50" r={radius + 6} />
      <circle
        className="ring__value"
        data-empty={shown === 0}
        cx="50"
        cy="50"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - shown / 100)}
      />
    </svg>
  );
}

export function WorldPassport({ stats, latestVisited }: WorldPassportProps) {
  const [showInfo, setShowInfo] = useState(false);
  const infoId = useId();
  const percent = formatPercent(stats.worldExploredPercent);

  return (
    <section className="passport" aria-labelledby={`${infoId}-title`}>
      <div className="passport__top">
        <p className="eyebrow eyebrow--accent">Globe Explorer · Passport</p>
        <button
          type="button"
          className="icon-btn icon-btn--plain icon-btn--tiny"
          aria-expanded={showInfo}
          aria-controls={infoId}
          aria-label="How is world explored calculated?"
          onClick={() => setShowInfo((v) => !v)}
        >
          <Info size={15} />
        </button>
      </div>
      <h2 id={`${infoId}-title`} className="passport__title">
        Your World Passport
      </h2>

      <div className="passport__main">
        <div className="passport__ring" role="img" aria-label={`${percent} of the world's ${TOTAL_COUNTRIES} countries explored`}>
          <ProgressRing percent={stats.worldExploredPercent} />
          <div className="passport__ring-label" aria-hidden="true">
            <span key={percent} className="passport__percent">{percent}</span>
            <span className="passport__ring-caption">explored</span>
          </div>
        </div>
        <div className="passport__headline">
          <p className="passport__countries">
            <span key={stats.visitedCountryCount} className="passport__big">{stats.visitedCountryCount}</span>
            <span className="passport__of"> / {TOTAL_COUNTRIES}</span>
          </p>
          <p className="passport__caption">
            {stats.visitedCountryCount === 1 ? 'country' : 'countries'} explored
          </p>
        </div>
      </div>

      <dl className="passport__stats">
        <div>
          <dt>Countries</dt>
          <dd>{stats.visitedCountryCount}</dd>
        </div>
        <div>
          <dt>Cities visited</dt>
          <dd>{stats.visitedCities}</dd>
        </div>
        <div>
          <dt>Wishlist</dt>
          <dd>{stats.wishlistCount}</dd>
        </div>
      </dl>

      {latestVisited && (
        <div key={latestVisited.id} className="stamp">
          <span className="stamp__ring" aria-hidden="true">
            <span className="stamp__code">{stampCode(latestVisited)}</span>
          </span>
          <span className="stamp__text">
            <span className="stamp__label">Latest stamp</span>
            <span className="stamp__place">{latestVisited.city}, {latestVisited.country}</span>
            <span className="stamp__date">{formatMonthYear(latestVisited.updatedAt)}</span>
          </span>
        </div>
      )}

      {showInfo && (
        <p id={infoId} className="passport__info">
          “World explored” is the share of <strong>countries</strong> you’ve visited, not land area:
          visited countries ÷ {TOTAL_COUNTRIES} × 100. The {TOTAL_COUNTRIES} are the 193 UN member states plus
          the 2 UN observer states (Holy See and Palestine). Territories such as Hong Kong count towards their
          sovereign state.
          {stats.uncountedRegionNames.length > 0 &&
            ` You’ve also visited ${stats.uncountedRegionNames.join(', ')}, which ${
              stats.uncountedRegionNames.length === 1 ? 'is' : 'are'
            } outside this list and not counted.`}
        </p>
      )}
    </section>
  );
}
