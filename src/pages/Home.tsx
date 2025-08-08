import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Sparkles, ArrowRight, Star } from 'lucide-react';
import { eventsAPI } from '../services/api';

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
  const [loading, setLoading] = useState(true);
  // Carousel state
  const [heroIndex, setHeroIndex] = useState(0);
  const [paused, setPaused] = useState(false); // added pause state

  useEffect(() => {
    const fetchFeaturedEvents = async () => {
      try {
        const response = await eventsAPI.getFeatured();
        setFeaturedEvents(response.data.events);
      } catch (error) {
        console.error('Error fetching featured events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedEvents();
  }, []);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

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
                  className="w-full h-full object-cover object-center scale-105 md:scale-100"
                  loading={idx === heroIndex ? 'eager' : 'lazy'}
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
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-luxury-gold to-luxury-gold bg-[length:200%_auto]">{active.title}</span>
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
            <div className="text-center">
              <div className="bg-gradient-to-r from-luxury-gold to-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-luxury-deep" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">500+</h3>
              <p className="text-gray-400">Events Hosted</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-luxury-gold to-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-luxury-deep" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">50K+</h3>
              <p className="text-gray-400">Happy Attendees</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-luxury-gold to-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-luxury-deep" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">4.9/5</h3>
              <p className="text-gray-400">Average Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-heading font-normal text-white mb-4">
              Featured Events
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Don't miss these upcoming spectacular performances and cultural experiences
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card-luxury p-6 animate-pulse">
                  <div className="bg-gray-700 h-48 rounded-lg mb-4"></div>
                  <div className="space-y-2">
                    <div className="bg-gray-700 h-4 rounded w-3/4"></div>
                    <div className="bg-gray-700 h-4 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredEvents.map((event) => (
                <Link 
                  key={event.id} 
                  to={`/events/${event.id}`}
                  className="card-luxury p-6 hover:transform hover:scale-105 transition-all duration-300 group"
                >
                  <div className="relative overflow-hidden rounded-lg mb-4 bg-gradient-to-br from-luxury-gold/20 to-yellow-500/20 h-48 flex items-center justify-center">
                    {event.posterImage || event.posterImageUrl ? (
                      <img 
                        src={resolvePoster(event) || ''} 
                        alt={event.title}
                        className="w-full h-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; }}
                      />
                    ) : (
                      <div className="text-center">
                        <Calendar className="h-12 w-12 text-luxury-gold mx-auto mb-2" />
                        <span className="text-luxury-gold font-medium">{event.type.toUpperCase()}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="inline-block px-3 py-1 bg-luxury-gold/20 text-luxury-gold text-xs font-medium rounded-full">
                      {event.category.toUpperCase()}
                    </span>
                    
                    <h3 className="text-lg font-semibold text-white group-hover:text-luxury-gold transition-colors line-clamp-2">
                      {event.title}
                    </h3>
                    
                    <div className="flex items-center text-gray-400 text-sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{formatDate(event.eventDate)}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-400 text-sm">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{event.venue}</span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-sm">
                        <span className="text-green-400">{event.availableSeats}</span>
                        <span className="text-gray-500"> / {event.totalSeats} seats</span>
                      </div>
                      <div className="text-luxury-gold font-semibold">
                        {event.basePrice === 0 ? 'FREE' : `₱${event.basePrice}`}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link 
              to="/events" 
              className="btn-secondary inline-flex items-center space-x-2"
            >
              <span>View All Events</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-luxury-deep to-luxury-night">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-heading font-normal text-white mb-6">
            Ready to Experience Something Amazing?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of students and enthusiasts in celebrating creativity, 
            culture, and excellence at CCIS.
          </p>
          <Link 
            to="/register" 
            className="btn-primary text-lg px-8 py-4 inline-flex items-center space-x-2"
          >
            <Users className="h-5 w-5" />
            <span>Join Our Community</span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
