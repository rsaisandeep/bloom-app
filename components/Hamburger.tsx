'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { spring } from '@/lib/motion';
import { useRouter } from 'next/navigation';
import PeriodStartModal from '@/components/PeriodStartModal';
import ChangelogSheet from '@/components/ChangelogSheet';
import { useInstall } from '@/lib/useInstall';
import { isViewer } from '@/lib/partners';
const LogSheet = dynamic(() => import('@/components/LogSheet'), { ssr: false });

export default function Hamburger({ username }: { username: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [readVisited, setReadVisited] = useState(true); // true = no badge (safe default before hydration)
  const [viewer, setViewer] = useState(false); // viewers don't track — hide the Track section
  const { canInstall, isIos, isIosSafari, installable, promptInstall } = useInstall();
  useEffect(() => {
    setMounted(true);
    setReadVisited(sessionStorage.getItem('bloom_read_visited') === 'true');
    setViewer(isViewer());
  }, []);

  // Lock background scroll while the drawer is open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleInstall() {
    if (canInstall) { promptInstall(); }
    setOpen(false); // on iOS, closing reveals Safari's Share button for "Add to Home Screen"
  }

  function handleReadNav() {
    setOpen(false);
    sessionStorage.setItem('bloom_read_visited', 'true');
    setReadVisited(true);
    router.push('/read');
  }

  const items = [
    { emoji: '📖', label: 'Read', sub: 'Articles & cycle guides', onClick: handleReadNav, badge: !readVisited },
  ];

  const sectionHdr: React.CSSProperties = {
    margin: '0 0 6px', fontSize: 12, fontWeight: 800, letterSpacing: 0.6,
    color: '#8A6A9A', textTransform: 'uppercase',
  };

  return (
    <>
      {/* Trigger */}
      <button onClick={() => setOpen(true)} aria-label="Menu" style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 8,
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        {[14, 20, 14].map((w, i) => (
          <div key={i} style={{ width: w, height: 2.4, background: '#1C0B2E', borderRadius: 2, alignSelf: 'flex-start' }} />
        ))}
      </button>

      {/* Overlay — portalled to document.body to escape TopBar's stacking context */}
      {mounted && createPortal(
        <AnimatePresence>
        {open && (
        <motion.div
          onClick={() => setOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(28,11,46,0.34)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        }}>
          {/* Panel */}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={spring}
            style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: '72%', maxWidth: 300,
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRight: '1px solid rgba(255,255,255,0.8)',
            boxShadow: '8px 0 48px rgba(110,52,130,0.22)',
            padding: '28px 20px', display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg,#6E3482,#A56ABD)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 800, color: '#fff',
                boxShadow: '0 6px 18px rgba(110,52,130,0.35)',
              }}>{username?.[0]?.toUpperCase() || '🌸'}</div>
              <div>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1C0B2E' }}>
                  {username ? username[0].toUpperCase() + username.slice(1) : 'Bloom'}
                </p>
                <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>Bloom member</p>
              </div>
            </div>

            {/* Sectioned items */}
            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1, overflowY: 'auto', marginRight: -4, paddingRight: 4 }}>

              {/* ACCOUNT */}
              <div>
                <p style={sectionHdr}>Account</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button onClick={() => { setOpen(false); router.push('/profile'); }} style={{
                    display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                    padding: '13px 16px', borderRadius: 18,
                    border: '1px solid rgba(165,106,189,0.25)',
                    background: 'rgba(237,233,255,0.5)', cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                  }}>
                    <span style={{ fontSize: 20 }}>⚙️</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>Settings</p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: '#8A6A9A' }}>Your account</p>
                    </div>
                  </button>
                  {installable && (
                    <button onClick={handleInstall} className="liquid-pill" style={{
                      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                      padding: '13px 16px', borderRadius: 18, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                    }}>
                      <span style={{ fontSize: 20 }}>📲</span>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>Install Bloom</p>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: '#8A6A9A' }}>
                          {!isIos ? 'Add to your home screen' : isIosSafari ? 'Tap Share, then Add to Home Screen' : 'Open in Safari to install'}
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* TRACK */}
              {!viewer && <div>
                <p style={sectionHdr}>Track</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <PeriodStartModal variant="menu" onDone={() => setOpen(false)} />
                  <button onClick={() => { setOpen(false); setShowLog(true); }} className="liquid-pill" style={{
                    display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                    padding: '13px 16px', borderRadius: 18, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                  }}>
                    <span style={{ fontSize: 20 }}>🌡️</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>Try BBT tracking</p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: '#8A6A9A' }}>Log today&apos;s basal body temperature</p>
                    </div>
                  </button>
                </div>
              </div>}

              {/* LEARN */}
              <div>
                <p style={sectionHdr}>Learn</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map((it) => (
                    <button key={it.label} onClick={it.onClick} className="liquid-pill" style={{
                      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                      padding: '13px 16px', borderRadius: 18, cursor: 'pointer',
                      fontFamily: 'var(--font-outfit)',
                    }}>
                      <span style={{ position: 'relative', fontSize: 20, flexShrink: 0 }}>
                        {it.emoji}
                        {it.badge && (
                          <span style={{
                            position: 'absolute', top: -2, right: -4,
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#E53E3E',
                            border: '1.5px solid rgba(255,255,255,0.9)',
                          }} />
                        )}
                      </span>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>{it.label}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: '#8A6A9A' }}>{it.sub}</p>
                      </div>
                    </button>
                  ))}
                  <button onClick={() => { setOpen(false); setShowChangelog(true); }} className="liquid-pill" style={{
                    display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                    padding: '13px 16px', borderRadius: 18, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                  }}>
                    <span style={{ fontSize: 20 }}>✨</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>What&apos;s new</p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: '#8A6A9A' }}>Latest features & updates</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* ABOUT */}
              <div>
                <p style={sectionHdr}>About</p>
                <div style={{ padding: '4px 4px 0' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1C0B2E' }}>Bloom v0.1.0</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#8A6A9A', lineHeight: 1.4 }}>Your cycle, understood — log a little, learn a lot.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}

      <LogSheet open={showLog} onClose={() => setShowLog(false)} />
      <ChangelogSheet open={showChangelog} onClose={() => setShowChangelog(false)} />
    </>
  );
}
