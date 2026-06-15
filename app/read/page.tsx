'use client';
import { useEffect, useState } from 'react';
import { ARTICLES, getArticle } from '@/lib/articles';
import { getCurrentPhase } from '@/lib/cycle';
import { fetchFromSheet } from '@/lib/data';
import TopBar from '@/components/TopBar';

const PHASE_SLUG: Record<string, string> = {
  menstrual: 'menstrual-phase',
  follicular: 'follicular-phase',
  ovulation: 'ovulation-phase',
  luteal: 'luteal-phase',
};

export default function ReadPage() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);

  useEffect(() => {
    fetchFromSheet().then((data) => {
      const { phase } = getCurrentPhase(data);
      setCurrentSlug(PHASE_SLUG[phase]);
    });
  }, []);

  const article = openSlug ? getArticle(openSlug) : null;

  // ── Detail view ──
  if (article) {
    return (
      <div style={{ minHeight: '100vh', padding: '20px 16px 24px' }}>
        <button onClick={() => setOpenSlug(null)} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          cursor: 'pointer', color: '#6E3482', fontSize: 14, fontWeight: 600,
          padding: '0 0 16px', fontFamily: 'var(--font-outfit)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="#6E3482" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All articles
        </button>

        <div className="anim-float" style={{
          borderRadius: 26, padding: '26px 22px', marginBottom: 18,
          background: `linear-gradient(135deg, ${article.tint}, rgba(255,255,255,0.4))`,
          border: `1px solid ${article.accent}33`,
        }}>
          <div style={{ fontSize: 46, marginBottom: 8 }}>{article.emoji}</div>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, letterSpacing: 1, color: article.accent, textTransform: 'uppercase' }}>
            {article.category} · {article.readMins} min read
          </p>
          <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: '#1C0B2E', letterSpacing: -0.5 }}>{article.title}</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6E3482', fontWeight: 600 }}>{article.subtitle}</p>
        </div>

        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {article.sections.map((s, i) => (
            <div key={i} className="glass-card" style={{ padding: '18px 18px' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800, color: article.accent }}>{s.heading}</h2>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#3A2A48' }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── List view ──
  const recommended = ARTICLES.filter((a) => a.slug === currentSlug);
  const rest = ARTICLES.filter((a) => a.slug !== currentSlug);

  return (
    <><TopBar title="Read" />
    <div style={{ minHeight: '100vh', padding: '4px 16px 24px' }}>
      <p className="anim-rise" style={{ margin: '0 0 14px', fontSize: 13, color: '#8A6A9A' }}>Curated guides on your cycle</p>

      {recommended.length > 0 && (
        <>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: '#A56ABD', textTransform: 'uppercase' }}>For you right now</p>
          {recommended.map((a) => (
            <button key={a.slug} onClick={() => setOpenSlug(a.slug)} className="shimmer-host anim-float" style={{
              width: '100%', textAlign: 'left', cursor: 'pointer', marginBottom: 18,
              borderRadius: 24, padding: '20px 20px', fontFamily: 'var(--font-outfit)',
              background: `linear-gradient(135deg, ${a.tint}, rgba(255,255,255,0.45))`,
              border: `1px solid ${a.accent}40`,
              boxShadow: `0 10px 30px ${a.accent}22`,
            }}>
              <div style={{ fontSize: 38, marginBottom: 8 }}>{a.emoji}</div>
              <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 800, letterSpacing: 0.8, color: a.accent, textTransform: 'uppercase' }}>Your current phase · {a.readMins} min</p>
              <p style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 800, color: '#1C0B2E' }}>{a.title}</p>
              <p style={{ margin: 0, fontSize: 13, color: '#6E3482', fontWeight: 600 }}>{a.subtitle}</p>
            </button>
          ))}
        </>
      )}

      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: '#A56ABD', textTransform: 'uppercase' }}>All articles</p>
      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rest.map((a) => (
          <button key={a.slug} onClick={() => setOpenSlug(a.slug)} className="glass-card" style={{
            display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', cursor: 'pointer',
            padding: '14px 16px', fontFamily: 'var(--font-outfit)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16, flexShrink: 0,
              background: a.tint, border: `1px solid ${a.accent}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            }}>{a.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 800, color: '#1C0B2E' }}>{a.title}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#8A6A9A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.subtitle}</p>
            </div>
            <span style={{ color: '#A56ABD', fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
    </div>
    </>
  );
}
