import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import {
  Search,
  Mail,
  ShoppingBag,
  Sparkles,
  BarChart,
  Bot,
  Check,
  ArrowRight,
  Zap,
  Target,
  Users,
  Globe,
  Box,
  Shield,
  MessageSquare,
  Smartphone,
  Globe2,
  Maximize2
} from 'lucide-react'
import logo from '../assets/n-services-logo.png'
import heroVideo from '../assets/landing/hero-bg.mp4'
import heroPoster from '../assets/landing/hero-ribbon.jpg'
import '../styles/landing.css'

/* ═══════════════════════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════════════════════ */
function Nav() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md lp-bg-canvas-70" style={{ borderBottom: '1px solid var(--lp-hairline)' }}>
      <div className="w-full px-8 h-14 flex items-center justify-end gap-8">
        <Link to="/welcome" className="mr-auto flex items-center gap-2.5">
          <img src={logo} alt="N-Services" className="h-7 w-auto" />
          <span className="text-lg font-bold tracking-tight lp-text-ink">N-Services</span>
        </Link>
        <div className="hidden md:flex items-center gap-7 text-sm lp-text-ink-secondary">
          <a href="#features" className="hover:opacity-80 transition-opacity">Features</a>
          <a href="#services" className="hover:opacity-80 transition-opacity">N-Services</a>
          <a href="#how" className="hover:opacity-80 transition-opacity">Workflow</a>
        </div>
        <Link to="/signup" className="lp-btn-pill lp-btn-primary px-5 py-1.5 text-sm">
          Get started
        </Link>
      </div>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════ */
function Hero() {
  return (
    <section className="relative pt-24 pb-20 overflow-hidden lp-bg-canvas">
      {/* Background Video/Poster Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          src={heroVideo}
          poster={heroPoster}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-[0.6] scale-105"
        />
        {/* Cinematic Overlays & Glows */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/30 via-pink-400/10 to-transparent opacity-80" />
        
        {/* Dynamic Glow Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] bg-pink-500/20 animate-pulse" />
        <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[30%] rounded-full blur-[100px] bg-purple-500/15" />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <div className="flex flex-col items-start text-left max-w-4xl mb-20">
          <h1 className="text-6xl md:text-7xl lg:text-8xl lp-text-ink mb-8 tracking-tighter text-left w-full font-bold leading-[1.1]">
            Smart <span className="lp-text-primary">client acquisition</span> for service businesses.
          </h1>
          <p className="text-xl md:text-2xl lp-text-ink-secondary mb-12 text-left w-full max-w-2xl leading-relaxed">
            The automated platform to acquire, evaluate, and <span className="lp-text-primary">run outreach</span> — from your first campaign to your millionth client.
          </p>
          <div className="flex flex-wrap items-center justify-start gap-5">
            <Link to="/signup" className="lp-btn-pill lp-btn-primary px-12 py-4.5 text-lg shadow-xl hover:translate-y-[-2px] transition-all">
              Start building for free
            </Link>
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <LogoMarquee />
      </div>

      <div className="relative w-full px-8 sm:px-12 lg:px-20">
        <div className="relative mt-1 mx-auto max-w-5xl pb-6">
          <DashboardMock />
        </div>
      </div>
    </section>
  )
}

function LogoMarquee() {
  const logos = [
    { name: "Stripe", filename: "stripe.png" },
    { name: "Supabase", filename: "supabase.png" },
    { name: "OpenAI", filename: "openai.png" },
    { name: "Shopify", filename: "shopify.png" },
    { name: "Apollo.io", filename: "apollo.png" },
    { name: "Google Maps", filename: "googlemaps.png" },
    { name: "Gmail", filename: "gmail.png" },
  ];
  const items = [...logos, ...logos, ...logos, ...logos];

  return (
    <div className="w-full mb-12" style={{ borderTop: '1px solid rgba(0,0,0,0.12)', borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
      <div className="marquee-mask w-full overflow-hidden">
        <div className="marquee-track flex flex-nowrap items-center gap-16 py-4">
          {items.map((l, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0 lp-text-ink-secondary">
              <img
                src={`/integrations/${l.filename}`}
                alt={l.name}
                className="h-7 w-auto object-contain"
                loading="lazy"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <span className="text-[15px] font-semibold tracking-tight lp-text-ink">
                {l.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardMock() {
  return (
    <div className="rounded-xl lp-bg-canvas border lp-border-hairline p-4 sm:p-6 text-left"
      style={{ boxShadow: 'var(--lp-shadow-float)' }}>
      <div className="flex items-center gap-1.5 mb-4">
        <span className="w-2.5 h-2.5 rounded-full lp-bg-ruby-70" />
        <span className="w-2.5 h-2.5 rounded-full lp-bg-canvas-cream" />
        <span className="w-2.5 h-2.5 rounded-full lp-bg-primary-soft" />
        <span className="ml-3 text-xs lp-text-ink-mute lp-tnum">app.n-services.io / pipeline</span>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-lg lp-bg-canvas-soft p-4 border lp-border-hairline">
          <div className="text-xs lp-text-ink-mute mb-1">Leads discovered</div>
          <div className="lp-display-lg lp-text-ink lp-tnum">12,480</div>
          <div className="mt-3 text-xs lp-text-primary-deep lp-tnum">+18.4% this week</div>
        </div>
        <div className="rounded-lg lp-bg-canvas-soft p-4 border lp-border-hairline">
          <div className="text-xs lp-text-ink-mute mb-1">Qualified by AI</div>
          <div className="lp-display-lg lp-text-ink lp-tnum">3,210</div>
          <div className="mt-3 flex gap-1">
            {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
              <span key={i} className="flex-1 rounded-sm lp-bg-primary-80" style={{ height: `${h / 3}px` }} />
            ))}
          </div>
        </div>
        <div className="rounded-lg lp-bg-brand-dark lp-text-primary-foreground p-4">
          <div className="text-xs opacity-70 mb-1">Reply rate</div>
          <div className="lp-display-lg lp-tnum">24.7%</div>
          <div className="mt-3 text-xs opacity-70">Across 48 active campaigns</div>
        </div>
      </div>
      <div className="mt-4 rounded-lg border lp-border-hairline overflow-hidden">
        <div className="grid grid-cols-12 text-xs lp-text-ink-mute lp-bg-canvas-soft px-4 py-2 uppercase tracking-wider">
          <span className="col-span-5">Lead</span>
          <span className="col-span-3">Channel</span>
          <span className="col-span-2 lp-tnum">Score</span>
          <span className="col-span-2">Status</span>
        </div>
        {[
          ['Brewline Coffee Co.', 'SEO Outreach', 92, 'Replied'],
          ['Northwind Logistics', 'B2B Sequence', 86, 'Engaged'],
          ['Lumen Apparel', 'Shopify RAG', 78, 'Queued'],
        ].map(([name, ch, score, status]) => (
          <div key={name} className="grid grid-cols-12 px-4 py-3 text-sm border-t lp-border-hairline items-center">
            <span className="col-span-5 lp-text-ink">{name}</span>
            <span className="col-span-3 lp-text-ink-mute">{ch}</span>
            <span className="col-span-2 lp-text-ink lp-tnum">{score}</span>
            <span className="col-span-2">
              <span className="lp-pill-tag">{status}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   AUTOMATION SHOWCASE
   ═══════════════════════════════════════════════════════════ */
function AutomationShowcase() {
  return (
    <section className="py-12 lp-bg-canvas">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-6 items-stretch">

          {/* 65% Card: Automation Flow (Text + Video) */}
          <div className="lg:col-span-8 rounded-3xl border lp-border-hairline p-8 lg:p-10 lp-bg-white flex flex-col justify-between" style={{ boxShadow: 'var(--lp-shadow-float)' }}>
            <div className="max-w-xl mb-10">
              <h2 className="lp-display-lg lp-text-ink mb-4">
                Automate and optimize <span className="lp-text-primary">outreach globally</span> — at scale
              </h2>
              <p className="lp-body-md lp-text-ink-mute mb-8">
                Simplify your pipeline, expand your reach, and boost conversion with AI-powered tools designed to acquire clients anywhere.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/signup" className="lp-btn-pill lp-btn-primary px-8">Explore Automation</Link>
                <Link to="#pricing" className="lp-btn-pill lp-btn-secondary px-8">See pricing details</Link>
              </div>
            </div>

            {/* Video Container */}
            <div className="relative rounded-2xl border lp-border-hairline overflow-hidden lp-bg-canvas-soft aspect-video flex items-center justify-center">
              <video
                src="/videos/automation-flow.mp4"
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            </div>
          </div>

          {/* 35% Card: 3D Globe */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="flex-1 rounded-3xl border lp-border-hairline bg-white relative overflow-hidden flex flex-col" style={{ boxShadow: 'var(--lp-shadow-float)' }}>

              <div className="absolute top-7 left-8 right-20 z-10">
                <h3 className="lp-text-ink font-display font-semibold tracking-tight text-[24px] leading-[1.15]">
                  Access borderless<br />money movement
                </h3>
              </div>

              <button
                type="button"
                className="absolute top-7 right-7 z-10 w-9 h-9 rounded-lg flex items-center justify-center lp-bg-primary-subdued transition-transform hover:scale-105"
              >
                <Maximize2 className="w-4 h-4 lp-text-primary-deep" />
              </button>

              <div className="flex-1 relative mt-24 min-h-[300px]">
                <ParticleGlobe />
              </div>

              <div className="p-8 pt-0 relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[13px] font-bold lp-text-ink lp-tnum">$419 / USDB</span>
                </div>
                <p className="text-[11px] font-medium lp-text-ink-mute uppercase tracking-widest">Live Global Transfer</p>
              </div>
            </div>

            {/* Secondary Mini Card */}
            <div className="rounded-3xl border lp-border-hairline p-6 lp-bg-brand-dark lp-text-primary-foreground">
              <p className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-2">Network Health</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold lp-tnum">99.9%</span>
                <Zap className="w-4 h-4 text-orange-400 mb-2 animate-pulse" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   PARTICLE GLOBE (3D VISUALIZATION)
   ═══════════════════════════════════════════════════════════ */
function ParticleGlobe() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const rotRef = useRef(0);
  const pointsRef = useRef(null);

  useEffect(() => {
    if (!pointsRef.current) pointsRef.current = generateLandPoints();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const gradColor = (nx, ny) => {
      const t = Math.max(0, Math.min(1, (nx + (1 - ny)) / 2));
      const stops = [
        { t: 0.0, c: [79, 70, 229] },  // Electric Indigo
        { t: 0.5, c: [236, 72, 153] }, // Hot Pink
        { t: 1.0, c: [249, 115, 22] }, // Bright Orange
      ];
      let a = stops[0], b = stops[stops.length - 1];
      for (let i = 0; i < stops.length - 1; i++) {
        if (t >= stops[i].t && t <= stops[i + 1].t) {
          a = stops[i]; b = stops[i + 1]; break;
        }
      }
      const lt = (t - a.t) / (b.t - a.t || 1);
      const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * lt);
      const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * lt);
      const bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * lt);
      return [r, g, bl];
    };

    const project = (lat, lon, rotY, R, cx, cy) => {
      const φ = (lat * Math.PI) / 180;
      const λ = ((lon * Math.PI) / 180) + rotY;
      const x = R * Math.cos(φ) * Math.sin(λ);
      const y = R * Math.sin(φ);
      const z = R * Math.cos(φ) * Math.cos(λ);
      return { x: cx + x, y: cy - y, z };
    };

    const arcs = [
      { a: { lat: 51, lon: -0.1 }, b: { lat: 40.7, lon: -74 } },
      { a: { lat: 1.3, lon: 103.8 }, b: { lat: 35.7, lon: 139.7 } },
      { a: { lat: -23.5, lon: -46.6 }, b: { lat: 6.5, lon: 3.4 } },
      { a: { lat: 25.2, lon: 55.3 }, b: { lat: 19.1, lon: 72.9 } },
      { a: { lat: 48.8, lon: 2.3 }, b: { lat: -33.9, lon: 18.4 } },
    ];

    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      rotRef.current += dt * 0.12;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const R = Math.min(w, h) * 0.55;
      const cx = w * 0.5;
      const cy = h * 0.5;

      const pts = pointsRef.current;
      if (!pts) return;
      const rotY = rotRef.current;

      const projectedPoints = pts.map(p => ({ ...p, pr: project(p.lat, p.lon, rotY, R, cx, cy) }))
        .sort((a, b) => a.pr.z - b.pr.z);

      for (let i = 0; i < projectedPoints.length; i++) {
        const p = projectedPoints[i];
        const prBase = p.pr;
        const depth = (prBase.z + R) / (2 * R);
        const [r, g, b] = gradColor((prBase.x - (cx - R)) / (2 * R), (prBase.y - (cy - R)) / (2 * R));

        // Permanent Base
        const baseAlpha = prBase.z < 0 ? 0.03 : (0.12 + depth * 0.55);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${baseAlpha})`;
        ctx.beginPath();
        ctx.arc(prBase.x, prBase.y, (0.45 + depth * 1.25) * dpr, 0, Math.PI * 2);
        ctx.fill();

        // Evaporating Vapor (Front only)
        if (prBase.z >= 0) {
          const timeFactor = (now * 0.0004 + p.phase) % 1;
          const prEvap = project(p.lat + timeFactor * 12, p.lon, rotY, R, cx, cy);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.05 + depth * 0.25) * (1 - timeFactor)})`;
          ctx.beginPath();
          ctx.arc(prEvap.x, prEvap.y, (0.45 + depth * 1.25) * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.lineWidth = 1.2 * dpr;
      for (const arc of arcs) {
        const A_raw = project(arc.a.lat, arc.a.lon, rotY, R, cx, cy);
        const B_raw = project(arc.b.lat, arc.b.lon, rotY, R, cx, cy);
        if (A_raw.z < -R * 0.2 && B_raw.z < -R * 0.2) continue;

        const steps = 15;
        ctx.beginPath();
        for (let j = 0; j <= steps; j++) {
          const t = j / steps;
          const lat = arc.a.lat + (arc.b.lat - arc.a.lat) * t;
          const lon = arc.a.lon + (arc.b.lon - arc.a.lon) * t;
          const lift = Math.sin(t * Math.PI) * (R * 0.25);
          const pr = project(lat, lon, rotY, R + lift, cx, cy);
          if (j === 0) ctx.moveTo(pr.x, pr.y); else ctx.lineTo(pr.x, pr.y);
          if (j === Math.floor(steps / 2)) {
            const [r, g, b] = gradColor((pr.x - (cx - R)) / (2 * R), (pr.y - (cy - R)) / (2 * R));
            ctx.strokeStyle = `rgba(${r},${g},${b},${0.4 + (pr.z + R) / (2 * R) * 0.4})`;
          }
        }
        ctx.stroke();

        for (const N of [arc.a, arc.b]) {
          const pr = project(N.lat, N.lon, rotY, R, cx, cy);
          if (pr.z < -R * 0.1) continue;
          const [r, g, b] = gradColor((pr.x - (cx - R)) / (2 * R), (pr.y - (cy - R)) / (2 * R));
          ctx.fillStyle = `rgba(${r},${g},${b},0.8)`;
          ctx.beginPath();
          ctx.arc(pr.x, pr.y, 2.5 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

function generateLandPoints() {
  const pts = [];
  const seeds = [
    { lat: 5, lon: 20, rLat: 35, rLon: 25 }, { lat: 50, lon: 15, rLat: 15, rLon: 25 },
    { lat: 40, lon: 90, rLat: 28, rLon: 45 }, { lat: 20, lon: 100, rLat: 18, rLon: 25 },
    { lat: 22, lon: 78, rLat: 12, rLon: 10 }, { lat: 28, lon: 45, rLat: 12, rLon: 14 },
    { lat: 45, lon: -100, rLat: 22, rLon: 35 }, { lat: 18, lon: -95, rLat: 8, rLon: 12 },
    { lat: -15, lon: -60, rLat: 30, rLon: 18 }, { lat: -25, lon: 134, rLat: 12, rLon: 18 },
    { lat: -3, lon: 118, rLat: 8, rLon: 18 }, { lat: 60, lon: 15, rLat: 10, rLon: 15 },
    { lat: 36, lon: 138, rLat: 8, rLon: 6 },
  ];
  const step = 1.0;
  for (let lat = -75; lat <= 78; lat += step) {
    const lonStep = step / Math.max(0.15, Math.cos((lat * Math.PI) / 180));
    for (let lon = -180; lon < 180; lon += lonStep) {
      let prob = 0;
      for (const s of seeds) {
        const dl = (lat - s.lat) / s.rLat;
        const dn = (lon - s.lon) / s.rLon;
        const d2 = dl * dl + dn * dn;
        if (d2 < 1) prob = Math.max(prob, 1 - d2);
      }
      const v = Math.sin(lat * 12.9898 + lon * 78.233) * 43758.5453;
      const noise = v - Math.floor(v);
      if (prob * 0.85 + noise * 0.25 > 0.45) pts.push({ lat, lon, phase: Math.random() });
    }
  }
  return pts;
}

/* ═══════════════════════════════════════════════════════════
   FEATURES / SERVICES / ETC
   ═══════════════════════════════════════════════════════════ */
function Features() {
  const items = [
    { icon: Target, title: 'Unified pipeline', desc: 'One workspace for SEO, B2B, and Shopify acquisition channels.' },
    { icon: Sparkles, title: 'AI lead scoring', desc: 'Evaluate every lead with custom personas and intent signals.' },
    { icon: Mail, title: 'Personalized outreach', desc: 'Generate and send tailored sequences without leaving the app.' },
    { icon: BarChart, title: 'Real-time analytics', desc: 'Reply rates, channel performance, and campaign health at a glance.' },
    { icon: Bot, title: 'Dedicated AI agents', desc: 'Agents that draft, send, and follow up on your behalf — 24/7.' },
    { icon: Zap, title: 'Fast to launch', desc: 'Go from import to first campaign in under 10 minutes.' },
  ]
  return (
    <section id="features" className="lp-bg-canvas-soft py-12">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="lp-display-xl lp-text-ink mb-4">Powerful features</h2>
          <p className="lp-body-lg lp-text-ink-secondary max-w-2xl mx-auto">Everything you need to automate your lead generation pipeline in one single platform.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="lp-bg-canvas border lp-border-hairline rounded-lg p-7" style={{ boxShadow: 'var(--lp-shadow-card)' }}>
              <div className="w-10 h-10 rounded-lg lp-bg-primary-subdued lp-text-primary-deep flex items-center justify-center mb-5"><Icon className="w-5 h-5" /></div>
              <h3 className="lp-heading-lg lp-text-ink mb-2">{title}</h3>
              <p className="text-[15px] lp-text-ink-mute">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Services() {
  const services = [
    { icon: Search, tag: 'Local Business Outreach', title: 'SEO Services', desc: 'Discover local businesses, audit their SEO health, and launch personalized outreach.', points: ['Discovery & enrichment', 'Automated SEO audits', 'Outreach sequences'] },
    { icon: Users, tag: 'Lead Generation Wizard', title: 'B2B Services', desc: 'Upload Apollo exports, evaluate lead quality with AI, and generate tailored email sequences.', points: ['Apollo CSV ingestion', 'AI scoring', 'Tailored sequences'] },
    { icon: ShoppingBag, tag: 'Shopify RAG Engine', title: 'Shopify AI Services', desc: 'Provision smart AI assistants for Shopify stores and use RAG to discover high-value leads.', points: ['Smart assistants', 'RAG lead discovery', 'Intent signals'] },
  ]
  return (
    <section id="services" className="py-12 lp-bg-canvas">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="max-w-2xl mb-8">
          <span className="lp-pill-tag mb-4">N-Services</span>
          <h2 className="lp-display-xl lp-text-ink mt-4">Three engines, one acquisition stack.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {services.map(({ icon: Icon, tag, title, desc, points }) => (
            <div key={title} className="rounded-lg border lp-border-hairline p-7 lp-bg-canvas flex flex-col" style={{ boxShadow: 'var(--lp-shadow-card)' }}>
              <div className="w-11 h-11 rounded-lg lp-bg-primary lp-text-primary-foreground flex items-center justify-center mb-5"><Icon className="w-5 h-5" /></div>
              <div className="text-xs uppercase tracking-wider lp-text-primary-deep mb-2">{tag}</div>
              <h3 className="lp-heading-lg lp-text-ink mb-3">{title}</h3>
              <p className="text-[15px] lp-text-ink-mute mb-5">{desc}</p>
              <ul className="space-y-2 mt-auto">
                {points.map(p => (
                  <li key={p} className="flex items-start gap-2 text-sm lp-text-ink-secondary"><Check className="w-4 h-4 mt-0.5 shrink-0 lp-text-primary" /> {p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how" className="py-12 lp-bg-canvas-cream">
      <div className="max-w-[1200px] mx-auto px-6">
        <h2 className="lp-display-xl lp-text-ink mb-12">From cold list to warm reply in three steps.</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[['01', 'Discover', 'Pull leads from local search or Apollo exports.'], ['02', 'Evaluate', 'AI scores leads against your persona.'], ['03', 'Engage', 'Tailored sequences send automatically.']].map(([n, t, d]) => (
            <div key={n} className="rounded-lg lp-bg-canvas p-7 border lp-border-hairline">
              <div className="text-sm lp-tnum lp-text-primary-deep mb-4">{n}</div>
              <h3 className="lp-heading-lg lp-text-ink mb-2">{t}</h3>
              <p className="text-[15px] lp-text-ink-mute">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section id="pricing" className="py-12 lp-bg-canvas-soft">
      <div className="max-w-[1200px] mx-auto px-6 text-center">
        <h2 className="lp-display-xl lp-text-ink mb-12">Plans for every stage of growth.</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              n: 'Basic',
              p: '0',
              d: 'Self-service platform access',
              features: ['1 domain, services', 'SEO discovery engine', 'B2B lead acquisition', 'AI lead scoring']
            },
            {
              n: 'Pro',
              p: '20',
              d: 'Platform + Dedicated Agents',
              f: true,
              features: ['1 domain, services, agent, automation script', 'Everything in Basic', 'Dedicated AI agents', 'Advanced channel analytics']
            },
            {
              n: 'Enterprise',
              p: '50',
              d: 'Full pipeline automation',
              features: ['Multiple domains, agent, services', 'Everything in Pro', 'End-to-end automation', 'Custom RAG integrations']
            }
          ].map(plan => (
            <div key={plan.n} className={`rounded-xl border p-8 flex flex-col text-left ${plan.f ? 'lp-bg-brand-dark lp-text-primary-foreground border-transparent scale-105 shadow-xl relative z-10' : 'lp-bg-white lp-border-hairline'}`} style={{ boxShadow: plan.f ? 'var(--lp-shadow-float)' : 'var(--lp-shadow-card)' }}>
              <div className="text-lg font-bold mb-1">{plan.n}</div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="lp-display-xxl lp-text-gradient lp-tnum font-bold">${plan.p}</span>
                <span className="opacity-70 ml-1">/mo</span>
              </div>
              <p className="text-sm opacity-70 mb-8">{plan.d}</p>

              <ul className="space-y-3 mb-10">
                {plan.features.map(feat => (
                  <li key={feat} className="flex items-start gap-3 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.f ? 'text-primary-400' : 'lp-text-primary'}`} />
                    <span className={plan.f ? 'opacity-90' : 'lp-text-ink-secondary'}>{feat}</span>
                  </li>
                ))}
              </ul>

              <Link to={`/signup?plan=${plan.n.toLowerCase()}`} className={`lp-btn-pill mt-auto w-full py-3 text-center font-bold ${plan.f ? 'lp-btn-primary' : 'lp-btn-secondary'}`}>Get started</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-12 lp-bg-canvas border-t lp-border-hairline">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="N-Services" className="h-6 w-auto" /><span className="text-lg font-bold tracking-tight lp-text-ink">N-Services</span>
        </div>
        <div className="text-sm lp-text-ink-mute">© 2026 N-Services. All rights reserved.</div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════════
   LANDING PAGE (MAIN EXPORT)
   ═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <div className="landing-page min-h-screen w-full">
      <Nav />
      <Hero />
      <AutomationShowcase />
      <Features />
      <Services />
      <HowItWorks />
      <Pricing />
      <Footer />
    </div>
  )
}
