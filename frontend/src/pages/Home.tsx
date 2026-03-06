import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.12 }
    );

    const elements = document.querySelectorAll('.reveal');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        :root {
          --bg: #f8fafc;
          --surface: rgba(255,255,255,0.75);
          --surface-solid: #ffffff;
          --text: #0f172a;
          --muted: #64748b;
          --border: rgba(15, 23, 42, 0.08);
          --primary: #2563eb;
          --primary-2: #7c3aed;
          --accent: #a855f7;
          --shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
          --shadow-soft: 0 10px 30px rgba(15, 23, 42, 0.06);
          --radius-xl: 24px;
          --radius-lg: 18px;
          --max-width: 1180px;
          --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
        }

        .dark {
          --bg: #050816;
          --surface: rgba(15,23,42,0.72);
          --surface-solid: #0f172a;
          --text: #f8fafc;
          --muted: #94a3b8;
          --border: rgba(255,255,255,0.08);
          --shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
          --shadow-soft: 0 10px 30px rgba(0, 0, 0, 0.28);
        }

        * {
          box-sizing: border-box;
        }

        body {
          background: var(--bg);
        }

        .home-wrap {
          color: var(--text);
          background:
            radial-gradient(circle at 10% 10%, rgba(59,130,246,0.12), transparent 25%),
            radial-gradient(circle at 90% 20%, rgba(168,85,247,0.12), transparent 25%),
            radial-gradient(circle at 50% 90%, rgba(124,58,237,0.10), transparent 30%),
            var(--bg);
          min-height: 100vh;
          overflow-x: hidden;
        }

        .home-wrap * {
          font-family: var(--font);
        }

        .container {
          width: 100%;
          max-width: var(--max-width);
          margin: 0 auto;
          padding: 0 1.25rem;
        }

        .glass {
          background: var(--surface);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-soft);
        }

        .section-label {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.45rem 0.9rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6d28d9;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(109,40,217,0.12);
        }

        .dark .section-label {
          color: #c4b5fd;
          background: rgba(30,41,59,0.62);
          border-color: rgba(196,181,253,0.12);
        }

        /* HERO */
        .hero-section {
          position: relative;
          padding: 6.5rem 0 4rem;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 2rem;
          align-items: center;
        }

        @media (max-width: 980px) {
          .hero-grid {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }
        }

        .hero-copy {
          position: relative;
          z-index: 2;
        }

        .hero-title {
          margin: 1.25rem 0 1rem;
          font-size: clamp(3rem, 7vw, 5.7rem);
          line-height: 0.96;
          letter-spacing: -0.05em;
          font-weight: 800;
          max-width: 10ch;
        }

        .hero-title .gradient-text {
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 45%, #c026d3 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-sub {
          max-width: 600px;
          font-size: 1.05rem;
          line-height: 1.8;
          color: var(--muted);
          margin-bottom: 2rem;
        }

        .hero-ctas {
          display: flex;
          flex-wrap: wrap;
          gap: 0.9rem;
          margin-bottom: 2rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          padding: 0.92rem 1.45rem;
          border-radius: 14px;
          font-size: 0.95rem;
          font-weight: 700;
          text-decoration: none;
          transition: 0.25s ease;
          position: relative;
          overflow: hidden;
          will-change: transform;
        }

        .btn-primary {
          color: white;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 55%, #a855f7 100%);
          box-shadow: 0 16px 40px rgba(99,102,241,0.35);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 22px 48px rgba(99,102,241,0.45);
        }

        .btn-secondary {
          color: var(--text);
          background: rgba(255,255,255,0.72);
          border: 1px solid var(--border);
          backdrop-filter: blur(12px);
        }

        .dark .btn-secondary {
          background: rgba(15,23,42,0.8);
        }

        .btn-secondary:hover {
          transform: translateY(-2px);
          border-color: rgba(124,58,237,0.3);
        }

        .hero-proof {
          display: flex;
          flex-wrap: wrap;
          gap: 0.7rem;
        }

        .proof-pill {
          padding: 0.55rem 0.85rem;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--muted);
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.58);
          backdrop-filter: blur(10px);
        }

        .dark .proof-pill {
          background: rgba(15,23,42,0.6);
        }

        .hero-visual {
          position: relative;
          min-height: 520px;
        }

        @media (max-width: 980px) {
          .hero-visual {
            min-height: 420px;
          }
        }

        .orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(75px);
          pointer-events: none;
          opacity: 0.6;
        }

        .orb-1 {
          width: 240px;
          height: 240px;
          top: 5%;
          left: 0;
          background: rgba(59,130,246,0.35);
        }

        .orb-2 {
          width: 260px;
          height: 260px;
          right: 5%;
          top: 15%;
          background: rgba(168,85,247,0.3);
        }

        .orb-3 {
          width: 220px;
          height: 220px;
          bottom: 10%;
          left: 18%;
          background: rgba(124,58,237,0.22);
        }

        .dashboard-card {
          position: absolute;
          inset: 0;
          border-radius: 30px;
          padding: 1.2rem;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.62));
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow: var(--shadow);
          backdrop-filter: blur(24px);
          overflow: hidden;
        }

        .dark .dashboard-card {
          background:
            linear-gradient(180deg, rgba(15,23,42,0.86), rgba(15,23,42,0.72));
          border-color: rgba(255,255,255,0.08);
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px);
          background-size: 28px 28px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.85), rgba(0,0,0,0.15));
          pointer-events: none;
        }

        .dash-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          position: relative;
          z-index: 1;
        }

        .dash-brand {
          display: flex;
          align-items: center;
          gap: 0.7rem;
        }

        .brand-mark {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          display: grid;
          place-items: center;
          color: white;
          font-weight: 800;
          box-shadow: 0 10px 24px rgba(99,102,241,0.35);
        }

        .dash-badge {
          padding: 0.45rem 0.7rem;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 700;
          color: #16a34a;
          background: rgba(34,197,94,0.10);
          border: 1px solid rgba(34,197,94,0.18);
        }

        .dash-panels {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 1rem;
          height: calc(100% - 56px);
        }

        @media (max-width: 640px) {
          .dash-panels {
            grid-template-columns: 1fr;
          }
        }

        .panel {
          border-radius: 22px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.62);
          backdrop-filter: blur(14px);
          padding: 1rem;
        }

        .dark .panel {
          background: rgba(15,23,42,0.72);
        }

        .panel-title {
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 0.9rem;
        }

        .reader-card {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .reader-line {
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(59,130,246,0.22), rgba(124,58,237,0.10));
        }

        .reader-line.w-90 { width: 90%; }
        .reader-line.w-80 { width: 80%; }
        .reader-line.w-72 { width: 72%; }
        .reader-line.w-60 { width: 60%; }

        .reader-progress {
          margin-top: 0.7rem;
          padding: 0.8rem;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(37,99,235,0.08), rgba(124,58,237,0.08));
          border: 1px solid rgba(99,102,241,0.12);
        }

        .progress-bar {
          margin-top: 0.55rem;
          height: 10px;
          border-radius: 999px;
          background: rgba(148,163,184,0.18);
          overflow: hidden;
        }

        .progress-fill {
          width: 72%;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #2563eb, #7c3aed);
        }

        .mini-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.8rem;
        }

        .mini-box {
          padding: 1rem;
          border-radius: 18px;
          background: rgba(255,255,255,0.58);
          border: 1px solid var(--border);
        }

        .dark .mini-box {
          background: rgba(2,6,23,0.55);
        }

        .mini-num {
          font-size: 1.55rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 0.25rem;
        }

        .mini-label {
          font-size: 0.78rem;
          color: var(--muted);
        }

        /* STATS STRIP */
        .stats-section {
          padding: 1rem 0 4rem;
        }

        .stats-wrap {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        @media (max-width: 840px) {
          .stats-wrap {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 520px) {
          .stats-wrap {
            grid-template-columns: 1fr;
          }
        }

        .stat-card {
          border-radius: 20px;
          padding: 1.3rem 1.2rem;
          text-align: left;
        }

        .stat-num {
          font-size: 2rem;
          line-height: 1;
          font-weight: 800;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.35rem;
        }

        .stat-label {
          font-size: 0.82rem;
          color: var(--muted);
          font-weight: 600;
        }

        /* FEATURES */
        .features-section,
        .about-section {
          padding: 5.5rem 0;
        }

        .section-heading {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 3rem;
        }

        .section-title-main {
          font-size: clamp(2rem, 4vw, 3.2rem);
          line-height: 1.05;
          letter-spacing: -0.04em;
          margin: 1rem 0 0.9rem;
          font-weight: 800;
        }

        .section-sub {
          color: var(--muted);
          font-size: 1rem;
          line-height: 1.8;
          max-width: 620px;
          margin: 0 auto;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.15rem;
        }

        @media (max-width: 1050px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
        }

        .feature-card {
          position: relative;
          display: block;
          text-decoration: none;
          color: inherit;
          border-radius: 24px;
          padding: 1.4rem;
          overflow: hidden;
          transition: 0.28s ease;
          min-height: 270px;
        }

        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow: var(--shadow);
          border-color: rgba(124,58,237,0.24);
        }

        .feature-glow {
          position: absolute;
          width: 160px;
          height: 160px;
          border-radius: 999px;
          filter: blur(48px);
          right: -40px;
          top: -40px;
          opacity: 0.22;
        }

        .glow-blue { background: #3b82f6; }
        .glow-purple { background: #a855f7; }
        .glow-indigo { background: #6366f1; }
        .glow-pink { background: #ec4899; }

        .feature-icon {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          font-size: 1.45rem;
          margin-bottom: 1rem;
          position: relative;
          z-index: 1;
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.6));
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 10px 30px rgba(15,23,42,0.08);
        }

        .dark .feature-icon {
          background: linear-gradient(135deg, rgba(30,41,59,0.92), rgba(15,23,42,0.72));
          border-color: rgba(255,255,255,0.06);
        }

        .feature-title {
          position: relative;
          z-index: 1;
          font-size: 1.1rem;
          font-weight: 800;
          margin-bottom: 0.65rem;
        }

        .feature-desc {
          position: relative;
          z-index: 1;
          color: var(--muted);
          line-height: 1.75;
          font-size: 0.92rem;
          margin-bottom: 1.2rem;
        }

        .feature-link {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: #6d28d9;
        }

        .dark .feature-link {
          color: #c4b5fd;
        }

        .feature-card:hover .feature-link {
          gap: 0.55rem;
        }

        /* ABOUT */
        .about-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.4rem;
          align-items: stretch;
        }

        @media (max-width: 980px) {
          .about-grid {
            grid-template-columns: 1fr;
          }
        }

        .about-card {
          border-radius: 28px;
          padding: 2rem;
          height: 100%;
        }

        .about-title {
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1.05;
          letter-spacing: -0.04em;
          margin: 1rem 0;
          font-weight: 800;
          max-width: 14ch;
        }

        .about-copy {
          color: var(--muted);
          line-height: 1.85;
          margin-bottom: 1.5rem;
          font-size: 0.98rem;
        }

        .about-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.7rem;
          margin-bottom: 1.7rem;
        }

        .pill {
          padding: 0.55rem 0.9rem;
          border-radius: 999px;
          background: rgba(255,255,255,0.64);
          border: 1px solid var(--border);
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--muted);
        }

        .dark .pill {
          background: rgba(15,23,42,0.7);
        }

        .about-list {
          display: grid;
          gap: 0.85rem;
        }

        .about-item {
          display: flex;
          gap: 0.9rem;
          align-items: flex-start;
          padding: 1rem;
          border-radius: 18px;
          background: rgba(255,255,255,0.5);
          border: 1px solid var(--border);
        }

        .dark .about-item {
          background: rgba(15,23,42,0.52);
        }

        .about-item-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, rgba(37,99,235,0.12), rgba(124,58,237,0.12));
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .about-item-title {
          font-weight: 800;
          margin-bottom: 0.25rem;
          font-size: 0.95rem;
        }

        .about-item-desc {
          color: var(--muted);
          line-height: 1.65;
          font-size: 0.86rem;
        }

        .showcase-card {
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(135deg, rgba(37,99,235,0.95), rgba(124,58,237,0.95));
          color: white;
        }

        .showcase-card::before {
          content: '';
          position: absolute;
          width: 280px;
          height: 280px;
          border-radius: 999px;
          top: -120px;
          right: -80px;
          background: rgba(255,255,255,0.09);
        }

        .showcase-card::after {
          content: '';
          position: absolute;
          width: 220px;
          height: 220px;
          border-radius: 999px;
          bottom: -100px;
          left: -80px;
          background: rgba(255,255,255,0.08);
        }

        .showcase-content {
          position: relative;
          z-index: 1;
        }

        .showcase-title {
          font-size: 2rem;
          line-height: 1.02;
          letter-spacing: -0.04em;
          margin-bottom: 0.9rem;
          font-weight: 800;
        }

        .showcase-copy {
          font-size: 0.95rem;
          line-height: 1.8;
          opacity: 0.9;
          max-width: 42ch;
          margin-bottom: 1.4rem;
        }

        .showcase-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          color: white;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.22);
          padding: 0.85rem 1.2rem;
          border-radius: 14px;
          font-size: 0.9rem;
          font-weight: 700;
          backdrop-filter: blur(8px);
          transition: 0.25s ease;
        }

        .showcase-btn:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.2);
        }

        .showcase-stats {
          margin-top: 1.8rem;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.9rem;
        }

        .showcase-stat {
          padding: 1rem;
          border-radius: 18px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.16);
          backdrop-filter: blur(8px);
        }

        .showcase-num {
          font-size: 1.7rem;
          line-height: 1;
          font-weight: 800;
          margin-bottom: 0.25rem;
        }

        .showcase-label {
          font-size: 0.76rem;
          opacity: 0.8;
          font-weight: 600;
        }

        /* REVEALS */
        .reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }

        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .reveal-delay-1 { transition-delay: 0.08s; }
        .reveal-delay-2 { transition-delay: 0.16s; }
        .reveal-delay-3 { transition-delay: 0.24s; }
        .reveal-delay-4 { transition-delay: 0.32s; }
      `}</style>

      <div className="home-wrap">
        <section className="hero-section">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="section-label reveal">
                <span>✦</span> All-in-one productivity platform
              </div>

              <h1 className="hero-title reveal reveal-delay-1">
                Work smarter. <br />
                <span className="gradient-text">Stay focused.</span>
              </h1>

              <p className="hero-sub reveal reveal-delay-2">
                Versatile combines ADHD-friendly reading, intelligent task planning,
                and time tracking into one polished workspace built for real focus,
                not fake productivity aesthetics.
              </p>

              <div className="hero-ctas reveal reveal-delay-3">
                <Link to="/hub" className="btn btn-primary">
                  Get Started <span>→</span>
                </Link>
                <Link to="/pdf-reader" className="btn btn-secondary">
                  Try PDF Reader
                </Link>
              </div>

              <div className="hero-proof reveal reveal-delay-4">
                <span className="proof-pill">ADHD-friendly UX</span>
                <span className="proof-pill">Auto-save progress</span>
                <span className="proof-pill">Clean focus-first workflow</span>
              </div>
            </div>

            <div className="hero-visual reveal reveal-delay-2">
              <div className="orb orb-1" />
              <div className="orb orb-2" />
              <div className="orb orb-3" />

              <div className="dashboard-card">
                <div className="grid-overlay" />

                <div className="dash-top">
                  <div className="dash-brand">
                    <div className="brand-mark">V</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                        Versatile
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                        Focus-first workflow
                      </div>
                    </div>
                  </div>
                  <div className="dash-badge">Live progress</div>
                </div>

                <div className="dash-panels">
                  <div className="panel">
                    <div className="panel-title">ADHD PDF Reader</div>
                    <div className="reader-card">
                      <div className="reader-line w-90" />
                      <div className="reader-line w-80" />
                      <div className="reader-line w-72" />
                      <div className="reader-line w-60" />

                      <div className="reader-progress">
                        <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Reading Session</div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          Page 24 of 33
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div className="panel">
                      <div className="panel-title">Focus Score</div>
                      <div className="mini-num">92%</div>
                      <div className="mini-label">Consistency this week</div>
                    </div>

                    <div className="mini-stats">
                      <div className="mini-box">
                        <div className="mini-num">4+</div>
                        <div className="mini-label">Core tools</div>
                      </div>
                      <div className="mini-box">
                        <div className="mini-num">0</div>
                        <div className="mini-label">Progress lost</div>
                      </div>
                    </div>

                    <div className="panel">
                      <div className="panel-title">Task Flow</div>
                      <div style={{ display: 'grid', gap: '0.6rem' }}>
                        {['Urgent & important', 'Planned deep work', 'Quick wins'].map((item) => (
                          <div
                            key={item}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              color: 'var(--muted)',
                              fontSize: '0.83rem',
                            }}
                          >
                            <span
                              style={{
                                width: 9,
                                height: 9,
                                borderRadius: 999,
                                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                display: 'inline-block',
                              }}
                            />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="stats-section">
          <div className="container">
            <div className="stats-wrap">
              {[
                { num: '4+', label: 'Integrated productivity tools' },
                { num: '100%', label: 'Built for focus-friendly flow' },
                { num: '0', label: 'Progress lost across sessions' },
                { num: '∞', label: 'Potential for better workflow' },
              ].map((s, i) => (
                <div key={s.label} className={`stat-card glass reveal reveal-delay-${i + 1}`}>
                  <div className="stat-num">{s.num}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="features-section">
          <div className="container">
            <div className="section-heading">
              <div className="section-label reveal">
                <span>✦</span> Core Features
              </div>
              <h2 className="section-title-main reveal reveal-delay-1">
                Serious tools. Zero clutter.
              </h2>
              <p className="section-sub reveal reveal-delay-2">
                Built to reduce friction, improve consistency, and help you actually
                finish work instead of just organizing it forever.
              </p>
            </div>

            <div className="features-grid">
              {[
                {
                  icon: '🧠',
                  glow: 'glow-blue',
                  title: 'ADHD PDF Reader',
                  desc: 'Read in manageable chunks with saved progress, auto-resume, and a layout designed for deep focus.',
                  to: '/pdf-reader',
                },
                {
                  icon: '⏱',
                  glow: 'glow-purple',
                  title: 'Office Hours Tracker',
                  desc: 'Track sessions, work hours, and breaks with a cleaner reporting flow that feels actually usable.',
                  to: '/office-hours',
                },
                {
                  icon: '📊',
                  glow: 'glow-indigo',
                  title: 'Eisenhower Matrix',
                  desc: 'Sort tasks by urgency and importance so your brain stops treating everything like a fire.',
                  to: '/hub',
                },
                {
                  icon: '⚡',
                  glow: 'glow-pink',
                  title: 'Productivity Toolkit',
                  desc: 'Access practical methods and systems that support focus, decision-making, and momentum.',
                  to: '/productivity',
                },
              ].map((f, i) => (
                <Link
                  to={f.to}
                  key={f.title}
                  className={`feature-card glass reveal reveal-delay-${i + 1}`}
                >
                  <div className={`feature-glow ${f.glow}`} />
                  <div className="feature-icon">{f.icon}</div>
                  <div className="feature-title">{f.title}</div>
                  <div className="feature-desc">{f.desc}</div>
                  <div className="feature-link">
                    Explore <span>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>


      </div>
    </>
  );
};

export default Home;