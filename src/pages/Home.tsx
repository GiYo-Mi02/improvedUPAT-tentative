import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Sparkles, ArrowRight, ArrowLeft, Star, X } from 'lucide-react';
const EventsCalendarLazy = lazy(() => import('../components/events/EventsCalendar'));
import Typewriter from '../components/ui/Typewriter';
import Reveal from '../components/ui/Reveal';
import Modal from '../components/ui/Modal';
import { eventsAPI, galleryAPI } from '../services/api';
import { usePublicAnnouncements } from '../hooks/useAnnouncements';
import { Megaphone } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  venue: string;
  type: string;
  category: string;
  posterImage?: string;
  posterImageUrl?: string; // new field from API
  availableSeats: number;
  totalSeats: number;
  basePrice: number;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SERVER_BASE = API_BASE.replace(/\/api$/i,'');
function resolvePoster(ev: Event) {
  if ((ev as any).posterImageUrl) return (ev as any).posterImageUrl;
  if (!ev.posterImage) return null;
  if (/^https?:/i.test(ev.posterImage)) return ev.posterImage;
  return `${SERVER_BASE}${ev.posterImage.startsWith('/') ? ev.posterImage : '/' + ev.posterImage}`;
}

const Home: React.FC = () => {
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [monthEvents, setMonthEvents] = useState<Event[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  // Carousel state
  const [heroIndex, setHeroIndex] = useState(0);
  const [paused, setPaused] = useState(false); // added pause state
  // Gallery
  const [gallery, setGallery] = useState<Array<{id:string; title:string; description?:string; imagePath:string}>>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeItem, setActiveItem] = useState<{id:string; title:string; description?:string; imagePath:string} | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef<boolean>(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const { items: announcements } = usePublicAnnouncements();
  const annScrollRef = useRef<HTMLDivElement | null>(null);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<any>(null);

  // Helper: announcement excerpt without relying on line-clamp plugin
  const annExcerpt = (text: string, limit = 220) => {
    const t = (text || '').toString();
    return t.length > limit ? t.slice(0, limit - 1) + '…' : t;
  };

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
  const fetchFeaturedEvents = async () => {
      try {
        const response = await eventsAPI.getFeatured();
        setFeaturedEvents(response.data.events);
      } catch (error) {
        console.error('Error fetching featured events:', error);
      }
    };

    fetchFeaturedEvents();

    // load gallery
    (async () => {
      try {
        const res = await galleryAPI.list();
        setGallery(res.data.items || []);
      } catch {}
    })();
  }, []);

  // Lazily load the calendar when its section becomes visible
  useEffect(() => {
    const node = calendarRef.current;
    if (!node || showCalendar) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        setShowCalendar(true);
        io.disconnect();
      }
    }, { threshold: 0.2, rootMargin: '0px 0px -80px 0px' });
    io.observe(node);
    return () => io.disconnect();
  }, [showCalendar]);

  // Fetch month events when calendar is shown or month changes
  useEffect(() => {
    if (!showCalendar) return;
    const loadMonth = async () => {
      const start = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
      const end = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
      try {
        const params: any = {
          status: 'published',
          page: 1,
          limit: 150,
          organizer: 'CCIS',
          from: start.toISOString(),
          to: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).toISOString(),
        };
        const res = await eventsAPI.getAll(params);
        const evs = (res.data.events || []) as Event[];
        setMonthEvents(evs);
      } catch {}
    };
    loadMonth();
  }, [showCalendar, calendarMonth]);

  // Build hero slides from events with posters (fallback if none)
  const heroSlides = (featuredEvents || [])
    .filter(e => (e.posterImage || (e as any).posterImageUrl))
    .slice(0, 4) // max 4
    .map(e => ({
      id: e.id,
      title: e.title,
      description: e.description || 'Experience an unforgettable event at CCIS.',
      cta: '/events/' + e.id,
      img: resolvePoster(e)
    }));

  // Generic themed fallback slides to guarantee at least 4
  const themedFallbacks = [
    {
      id: 'fallback-1',
      title: 'Discover Inspiring Performances',
      description: 'World‑class productions, cultural showcases, and academic excellence all on one stage.',
      cta: '/events',
      img: null as string | null,
    },
    {
      id: 'fallback-2',
      title: 'Elevate Your Campus Life',
      description: 'Engage with student creativity and vibrant showcases at CCIS.',
      cta: '/events?category=performance',
      img: null as string | null,
    },
    {
      id: 'fallback-3',
      title: 'Be Part of the Audience',
      description: 'Reserve seats early and never miss a spotlight moment again.',
      cta: '/events',
      img: null as string | null,
    },
    {
      id: 'fallback-4',
      title: 'Celebrate Talent & Culture',
      description: 'From academic forums to grand performances – explore what’s coming next.',
      cta: '/events',
      img: null as string | null,
    },
  ];

  // Merge ensuring at least 4 slides
  let slides: typeof heroSlides = [];
  if (heroSlides.length >= 4) {
    slides = heroSlides;
  } else if (heroSlides.length > 0) {
    slides = [...heroSlides, ...themedFallbacks.slice(0, 4 - heroSlides.length)];
  } else {
    slides = themedFallbacks.slice(0, 4);
  }

  // Auto-advance
  useEffect(() => {
    if (slides.length < 3 || paused) return; // nothing to rotate or paused
    const interval = setInterval(() => {
      setHeroIndex(i => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length, paused]);

  const active = slides[heroIndex] || slides[0];

  // formatDate no longer used in calendar view

  // Seamless rAF-driven marquee for gallery
  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;
    if (gallery.length === 0) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return; // respect reduced motion

    let raf = 0;
    let x = 0; // current translateX
    const speed = 1; // px per frame at ~60fps; tweak for taste
    let halfWidth = Math.max(track.scrollWidth / 2, 1);

    const recalc = () => {
      // measure off-thread between frames
      halfWidth = Math.max(track.scrollWidth / 2, 1);
    };
    const onResize = () => { recalc(); };
    window.addEventListener('resize', onResize);

    const step = () => {
      if (!pausedRef.current) {
        x -= speed;
        if (Math.abs(x) >= halfWidth) {
          x += halfWidth;
        }
        track.style.transform = `translate3d(${x}px, 0, 0)`;
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, [gallery]);

  return (
    <div className="min-h-screen">
      {/* Hero Carousel */}
      <section className="relative h-[520px] md:h-[600px] lg:h-[680px] overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {/* Slide images */}
        <div className="absolute inset-0">
          {slides.map((s, idx) => (
            <div
              key={s.id}
              className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out ${idx === heroIndex ? 'opacity-100' : 'opacity-0'} bg-luxury-night`}
            >
              {s.img ? (
                <img
                  src={s.img}
                  alt={s.title}
                  className="w-full h-full object-cover object-center scale-105 md:scale-100 brightness-50"
                  loading={idx === heroIndex ? 'eager' : 'lazy'}
                  fetchPriority={idx === heroIndex ? 'high' : 'low'}
                  sizes="100vw"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-luxury-deep via-luxury-night to-black flex items-center justify-center text-luxury-gold/30 text-5xl font-heading tracking-wider">CCIS</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-black/70 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,215,128,0.08),transparent_60%)]" />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 bg-luxury-gold/15 border border-luxury-gold/30 backdrop-blur px-5 py-2 rounded-full">
              <span className="text-luxury-gold text-sm font-medium"> CCIS Student Council</span>
              {heroSlides.length > 0 && <span className="text-[10px] uppercase tracking-widest text-luxury-champagne/70">Featured</span>}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-heading font-normal text-white leading-[1.05] mb-6">
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-luxury-gold to-luxury-gold bg-[length:200%_auto]">
                <Typewriter text={active.title} resetKey={active.id + ':' + heroIndex} speedMs={24} startDelayMs={150} />
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300/90 leading-relaxed mb-8 max-w-2xl transition-opacity duration-500">
              {active.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to={active.cta} className="btn-primary text-base px-8 py-4 inline-flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{heroSlides.length ? 'View Event' : 'Explore Events'}</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/events" className="btn-secondary text-base px-8 py-4 inline-flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span>All Events</span>
              </Link>
            </div>
          </div>

          {/* Dots */}
          {slides.length > 1 && (
            <div className="mt-10 flex gap-2">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  aria-label={`Go to slide ${idx + 1}`}
                  onClick={() => setHeroIndex(idx)}
                  className={`h-2.5 rounded-full transition-all duration-500 ${idx === heroIndex ? 'bg-luxury-gold w-8' : 'bg-white/30 hover:bg-white/50 w-2.5'}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

  {/* Stats Section */}
      <section className="py-16 bg-luxury-deep/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Reveal className="text-center" delay={50}>
              <div className="bg-gradient-to-r from-luxury-gold to-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-luxury-deep" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">500+</h3>
              <p className="text-gray-400">Events Hosted</p>
            </Reveal>
            <Reveal className="text-center" delay={120}>
              <div className="bg-gradient-to-r from-luxury-gold to-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-luxury-deep" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">50K+</h3>
              <p className="text-gray-400">Happy Attendees</p>
            </Reveal>
            <Reveal className="text-center" delay={190}>
              <div className="bg-gradient-to-r from-luxury-gold to-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-luxury-deep" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">4.9/5</h3>
              <p className="text-gray-400">Average Rating</p>
            </Reveal>
          </div>
        </div>
      </section>

       {/* Announcement Section */}
      {announcements && announcements.length > 0 && (
        <section className="py-10 bg-gradient-to-br from-black/60 to-luxury-deep/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="mb-4" variant="up">
              <div className="flex items-center gap-2 text-luxury-gold">
                <Megaphone className="h-5 w-5" />
                <h2 className="text-xl font-heading">Announcements</h2>
              </div>
            </Reveal>
            {/* Horizontal scroll container with controls */}
            <div className="relative -mx-4">
              {/* Left button (md+), positioned just outside content */}
              <button
                type="button"
                aria-label="Scroll announcements left"
                onClick={() => annScrollRef.current?.scrollBy({ left: -Math.round((annScrollRef.current?.clientWidth || 600) * 0.85), behavior: 'smooth' })}
                className="hidden md:flex absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white shadow"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              {/* Right button (md+), positioned just outside content */}
              <button
                type="button"
                aria-label="Scroll announcements right"
                onClick={() => annScrollRef.current?.scrollBy({ left: Math.round((annScrollRef.current?.clientWidth || 600) * 0.85), behavior: 'smooth' })}
                className="hidden md:flex absolute right-0 translate-x-1/2 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white shadow"
              >
                <ArrowRight className="w-5 h-5" />
              </button>

              <div
                ref={annScrollRef}
                className="px-2 sm:px-4 lg:px-6 flex gap-4 xl:gap-6 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
                role="region"
                aria-label="Announcements horizontal scroller"
              >
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className="card-luxury p-4 w-[90vw] sm:w-[75vw] md:w-[520px] lg:w-[560px] xl:w-[480px] 2xl:w-[520px] flex-shrink-0 snap-center xl:snap-start cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => { setActiveAnnouncement(a); setShowAnnModal(true); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setActiveAnnouncement(a); setShowAnnModal(true); } }}
                  >
                    <div className="text-white font-medium mb-2 truncate">{a.title}</div>
                    <div className="flex flex-col gap-3">
                      {a.imagePath && (
                        <img
                          src={/^https?:/i.test(a.imagePath) ? (a.imagePath as string) : `${SERVER_BASE}${(a.imagePath as string).startsWith('/') ? a.imagePath : '/' + a.imagePath}`}
                          alt={a.title}
                          className="w-full h-48 sm:h-56 md:h-60 object-cover rounded-md border border-white/10"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <div className="text-gray-300 text-sm whitespace-pre-wrap">{annExcerpt(a.message, 220)}</div>
                      <button
                        type="button"
                        className="self-start text-luxury-gold text-xs hover:underline"
                        onClick={(e) => { e.stopPropagation(); setActiveAnnouncement(a); setShowAnnModal(true); }}
                      >
                        Read more
                      </button>
                    </div>
                    {a.endsAt && (
                      <div className="text-xs text-gray-400 mt-2">Until {new Date(a.endsAt).toLocaleString()}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Edge fades (do not block interactions) */}
              <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-full w-6 sm:w-8 xl:w-12 bg-gradient-to-r from-black/50 to-transparent" />
              <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-full w-6 sm:w-8 xl:w-12 bg-gradient-to-l from-black/50 to-transparent" />
            </div>
          </div>
        </section>
      )}

      {/* Announcement Modal */}
      {showAnnModal && activeAnnouncement && (
        <Modal isOpen={showAnnModal} onClose={() => setShowAnnModal(false)} title={activeAnnouncement.title} maxWidthClass="max-w-5xl">
          <div className="flex flex-col md:flex-row gap-5">
            <div className="md:basis-1/2 md:max-w-[50%] flex-shrink-0">
              {activeAnnouncement.imagePath && (
                <img
                  src={/^https?:/i.test(activeAnnouncement.imagePath) ? activeAnnouncement.imagePath : `${SERVER_BASE}${activeAnnouncement.imagePath.startsWith('/') ? activeAnnouncement.imagePath : '/' + activeAnnouncement.imagePath}`}
                  alt={activeAnnouncement.title}
                  className="w-full max-h-[70vh] object-contain rounded-md border border-white/10"
                />
              )}
            </div>
            <div className="md:basis-1/2 md:max-w-[50%] flex flex-col min-h-0">
              {activeAnnouncement.endsAt && (
                <div className="text-xs text-gray-400 text-right mb-2">Until {new Date(activeAnnouncement.endsAt).toLocaleString()}</div>
              )}
              <div className="text-gray-200 whitespace-pre-wrap overflow-y-auto pr-2 max-h-[70vh]">
                {activeAnnouncement.message}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Calendar of Events */}
  <section className="py-20" ref={calendarRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-12" variant="up">
            <h2 className="text-3xl lg:text-4xl font-heading font-normal text-white mb-4">CCIS Upcoming Events</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">Browse this month’s schedule at a glance.</p>
          </Reveal>
          <Reveal className="card-luxury p-6" variant="up" delay={80}>
            {showCalendar ? (
              <Suspense fallback={<div className="text-gray-400">Loading calendar…</div>}>
                <EventsCalendarLazy
                  events={monthEvents as any}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                />
              </Suspense>
            ) : (
              <div className="text-gray-400">Preparing calendar…</div>
            )}
          </Reveal>
        </div>
      </section>

      {/* Gallery Section */}
      {gallery.length > 0 && (
        <section className="py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="text-center mb-8" variant="up">
              <h2 className="text-3xl lg:text-4xl font-heading font-normal text-white mb-2">Moments Gallery</h2>
              <p className="text-gray-400">Highlights from our community events</p>
            </Reveal>

            {/* Horizontal continuous scroll (rAF-driven, seamless) */}
            <div
              ref={containerRef}
              className="relative overflow-hidden rounded-xl"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <div ref={trackRef} className="flex gap-4 will-change-transform" style={{ transform: 'translate3d(0,0,0)' }}>
                {[...gallery, ...gallery].map((g, idx) => (
                  <div
                    key={g.id + '-' + idx}
                    className="w-84 h-60 md:w-80 md:h-48 lg:w-96 lg:h-56 shrink-0 relative group cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => { setActiveItem(g); setShowModal(true); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setActiveItem(g); setShowModal(true); } }}
                  >
       <img
         src={/^https?:/i.test(g.imagePath) ? g.imagePath : `${SERVER_BASE}${g.imagePath.startsWith('/') ? g.imagePath : '/' + g.imagePath}`}
         alt={g.title}
         loading="lazy"
         decoding="async"
         sizes="(min-width: 1024px) 384px, (min-width: 768px) 320px, 336px"
         className="w-full h-full object-cover rounded-lg" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white text-sm">
                      <div className="font-semibold line-clamp-1">{g.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Image Modal */}
      {showModal && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowModal(false)} />
          <div className="relative bg-luxury-night border border-white/10 rounded-xl max-w-6xl w-full overflow-hidden shadow-2xl">
            <button className="absolute top-3 right-3 text-white/80 hover:text-white" onClick={() => setShowModal(false)} aria-label="Close">
              <X className="w-6 h-6" />
            </button>
            <div className="grid md:grid-cols-2 gap-0">
              <div className="aspect-video md:aspect-auto">
       <img src={/^https?:/i.test(activeItem.imagePath) ? activeItem.imagePath : `${SERVER_BASE}${activeItem.imagePath.startsWith('/') ? activeItem.imagePath : '/' + activeItem.imagePath}`}
         alt={activeItem.title}
         className="w-full h-full object-cover" />
              </div>
              <div className="p-5">
                <h3 className="text-2xl font-heading text-white mb-2">{activeItem.title}</h3>
                <br></br>
                <p className="text-gray-300 whitespace-pre-wrap">{activeItem.description || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-luxury-deep to-luxury-night">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <Reveal variant="up">
            <h2 className="text-3xl lg:text-4xl font-heading font-normal text-white mb-6">
              Ready to Experience Something Amazing?
            </h2>
          </Reveal>
          <Reveal variant="up" delay={80}>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of students and enthusiasts in celebrating creativity, 
              culture, and excellence at CCIS.
            </p>
          </Reveal>
          <Reveal variant="up" delay={140}>
            <Link 
              to="/register" 
              className="btn-primary text-lg px-8 py-4 inline-flex items-center space-x-2"
            >
              <Users className="h-5 w-5" />
              <span>Join Our Community</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

export default Home;
