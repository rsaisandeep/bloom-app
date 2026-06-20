'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getArticle } from '@/lib/articles';
import { getCurrentPhase } from '@/lib/cycle';
import { fetchFromSheet } from '@/lib/data';
import TopBar from '@/components/TopBar';

const PHASE_SLUG: Record<string, string> = {
  menstrual: 'menstrual-phase',
  follicular: 'follicular-phase',
  ovulation: 'ovulation-phase',
  luteal: 'luteal-phase',
};

// Content-based groupings for the Read library (collapsible tiles).
const GROUPS: { id: string; title: string; emoji: string; blurb: string; slugs: string[] }[] = [
  { id: 'phases', title: 'Your cycle phases', emoji: '🌙', blurb: 'What happens in each phase', slugs: ['menstrual-phase', 'follicular-phase', 'ovulation-phase', 'luteal-phase'] },
  { id: 'fertility', title: 'Fertility & birth control', emoji: '🌸', blurb: 'Conceiving, contraception & tracking', slugs: ['fertility-awareness', 'contraception-and-your-cycle'] },
  { id: 'symptoms', title: 'Symptoms & when to worry', emoji: '💗', blurb: 'PMS, PMDD & period red flags', slugs: ['pms-and-pmdd', 'when-to-see-a-doctor'] },
  { id: 'lifestyle', title: 'Nutrition & lifestyle', emoji: '🥗', blurb: 'Eating and living with your rhythm', slugs: ['eating-with-your-cycle', 'cycle-syncing-basics'] },
  { id: 'conditions', title: 'Conditions & life stages', emoji: '🩺', blurb: 'PCOS & perimenopause', slugs: ['understanding-pcos', 'reversing-pcos', 'perimenopause-basics'] },
];

export default function ReadPage() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    sessionStorage.setItem('bloom_read_visited', 'true');
    // Support direct article open via ?open=slug (e.g. from symptom chip links)
    try {
      const slug = new URL(window.location.href).searchParams.get('open');
      if (slug) setOpenSlug(slug);
    } catch {}
    fetchFromSheet().then((data) => {
      const { phase } = getCurrentPhase(data);
      setCurrentSlug(PHASE_SLUG[phase]);
    });
  }, []);

  useEffect(() => {
    if (openSlug) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [openSlug]);

  function toggleGroup(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const article = openSlug ? getArticle(openSlug) : null;

  // ── Detail view ──
  if (article) {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        {/* Sticky back bar */}
        <div style={{
          flexShrink: 0,
          padding: '10px 16px 10px',
          background: 'rgba(238,232,245,0.92)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          borderBottom: '1px solid rgba(165,106,189,0.12)',
        }}>
          <button onClick={() => setOpenSlug(null)} style={{
            display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            cursor: 'pointer', color: '#6E3482', fontSize: 14, fontWeight: 600,
            padding: 0, fontFamily: 'var(--font-outfit)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke="#6E3482" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All articles
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px' }}>
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
      </div>,
      document.body
    );
  }

  // ── List view ──
  const recommended = currentSlug ? getArticle(currentSlug) : null;

  const row = (a: NonNullable<ReturnType<typeof getArticle>>) => (
    <button key={a.slug} onClick={() => setOpenSlug(a.slug)} className="glass-card" style={{
      display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', cursor: 'pointer',
      padding: '12px 14px', fontFamily: 'var(--font-outfit)', width: '100%',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14, flexShrink: 0,
        background: a.tint, border: `1px solid ${a.accent}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>{a.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontSize: 14.5, fontWeight: 800, color: '#1C0B2E' }}>{a.title}</p>
        <p style={{ margin: 0, fontSize: 12, color: '#8A6A9A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.subtitle}</p>
      </div>
      <span style={{ color: '#A56ABD', fontSize: 18 }}>›</span>
    </button>
  );

  return (
    <><TopBar title="Read" />
    <div style={{ minHeight: '100dvh', padding: '4px 16px 24px' }}>
      <p className="anim-rise" style={{ margin: '0 0 14px', fontSize: 13, color: '#8A6A9A' }}>Curated guides on your cycle</p>

      {recommended && (
        <>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: '#A56ABD', textTransform: 'uppercase' }}>For you right now</p>
          <button onClick={() => setOpenSlug(recommended.slug)} className="shimmer-host anim-float" style={{
            width: '100%', textAlign: 'left', cursor: 'pointer', marginBottom: 20,
            borderRadius: 24, padding: '20px 20px', fontFamily: 'var(--font-outfit)',
            background: `linear-gradient(135deg, ${recommended.tint}, rgba(255,255,255,0.45))`,
            border: `1px solid ${recommended.accent}40`,
            boxShadow: `0 10px 30px ${recommended.accent}22`,
          }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>{recommended.emoji}</div>
            <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 800, letterSpacing: 0.8, color: recommended.accent, textTransform: 'uppercase' }}>Your current phase · {recommended.readMins} min</p>
            <p style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 800, color: '#1C0B2E' }}>{recommended.title}</p>
            <p style={{ margin: 0, fontSize: 13, color: '#6E3482', fontWeight: 600 }}>{recommended.subtitle}</p>
          </button>
        </>
      )}

      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: '#A56ABD', textTransform: 'uppercase' }}>Browse by topic</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {GROUPS.map((g) => {
          const isOpen = expanded.has(g.id);
          const items = g.slugs.map(getArticle).filter((a): a is NonNullable<typeof a> => !!a);
          return (
            <div key={g.id}>
              <button onClick={() => toggleGroup(g.id)} className="glass-card" style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer',
                padding: '14px 16px', fontFamily: 'var(--font-outfit)',
              }}>
                <span style={{ fontSize: 24 }}>{g.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 800, color: '#1C0B2E' }}>{g.title}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#8A6A9A' }}>{g.blurb} · {items.length}</p>
                </div>
                <span style={{ color: '#A56ABD', fontSize: 14, transition: 'transform .25s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
              </button>
              {isOpen && (
                <div className="anim-rise" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0 4px 10px' }}>
                  {items.map(row)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
