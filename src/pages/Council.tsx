import React, { useEffect, useState } from 'react';
import { Users, Quote, Award, Calendar, Shield } from 'lucide-react';

interface Officer {
  id: string;
  name: string;
  position: string; 
  subRoles?: string[]; 
  course: string;
  year: string;
  quote: string;
  avatar?: string; 
  achievements?: string[];
}

const historyParagraphs: string[] = [
  'The CCIS Student Council has been the representative governing body of the College of Computing and Information Sciences, championing innovation, academic excellence, and student welfare.',
  'Founded to unify student voices across computing disciplines, the Council has organized seminars, coding competitions, outreach programs, and wellness initiatives that foster both technical growth and holistic development.',
  'Over the years, the Council expanded collaborative partnerships with industry mentors and other academic organizations, ensuring that CCIS students remain future‑ready and community driven.'
];

// Officers with primary position + sub roles
const officers: Officer[] = [
  {
    id: '1',
    name: 'Jeane Mabignay',
    position: 'Chairperson',
    subRoles: ['USC - Student Welfare'],
    course: 'BS Computer Science',
    year: '2nd Year',
    quote: 'Leadership is service rooted in purpose and integrity.',
    avatar: '/officers/jeane.jpg',
  },
  {
    id: '2',
    name: 'Shaun Kendrick Duno',
    position: 'Vice Chairperson',
    subRoles: ['Head of External Affairs'],
    course: 'BS Information Technology',
    year: '2nd Year',
    quote: 'Empowering learners today builds the innovators of tomorrow.',
    avatar: '/officers/shaun.jpg' 
  },
  {
    id: '3',
    name: 'Cyzbelle Ombao',
    position: 'Secretary',
    subRoles: ['Head of Logistics'],
    course: 'Diploma in Information Systems',
    year: '2nd Year',
    quote: 'Structured information empowers smart decisions.',
    avatar: '/officers/czybelle.jpg' 
  },
  {
    id: '4',
    name: 'James Arnel Urbano',
    position: 'Treasurer',
    subRoles: ['Head of Finance'],
    course: 'BS Information Technology',
    year: '2nd Year',
    quote: 'Transparency and trust keep our initiatives sustainable.',
    avatar: '/officers/james.jpg'
  },
  {
    id: '5',
    name: 'Raem Matencio',
    position: 'Auditor',
    subRoles: ['Head of Inventory'],
    course: 'BS Information Technology',
    year: '2nd Year',
    quote: 'Every record tells a story of stewardship.',
    avatar: '/officers/raem.jpg'
  },
  {
    id: '6',
    name: 'Pole Buendia',
    position: '4th Year Representative',
    subRoles: ['Head of Creatives'],
    course: 'BS Information Technology',
    year: '4th Year',
    quote: 'Creativity turns ideas into meaningful experiences.',
    avatar: '/officers/pole.jpg'
  },
  {
    id: '7',
    name: 'Shaina Merano',
    position: '3rd Year Representative',
    course: 'BS Information Technology',
    year: '3rd Year',
    quote: 'Every student voice matters in shaping our path.',
    avatar: '/officers/shaina.jpg'
  },
  {
    id: '8',
    name: 'Cristof Siringan',
    position: '2nd Year Representative',
    subRoles: ['Head of Technicals'],
    course: 'BS Computer Science',
    year: '2nd Year',
    quote: 'Technical excellence is built on curiosity and consistency.',
    avatar: '/officers/cristof.jpg'
  },
  {
    id: '9',
    name: 'Isabel San Esteban',
    position: 'Head of Publicity',
    course: 'BS Computer Science',
    year: '2nd Year',
    quote: 'Engagement begins with a clear and authentic message.',
    avatar: '/officers/isabel.jpg'
  }
];

function resolveAvatar(path?: string) {
  if (!path) return undefined;
  const base = import.meta.env.BASE_URL || '/';
  const cleaned = path.startsWith('/') ? path.slice(1) : path;
  return base + cleaned;
}

const Council: React.FC = () => {
  const chairperson = officers.find(o => o.position === 'Chairperson');
  const otherOfficers = officers.filter(o => o.position !== 'Chairperson');
  
  const renderOfficerCard = (officer: Officer) => (
    <div key={officer.id} className="card-luxury p-6 flex flex-col group hover:shadow-luxury transition-all duration-300">
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-full mx-auto bg-gradient-to-br from-luxury-gold/30 to-yellow-500/20 flex items-center justify-center text-luxury-gold text-4xl font-heading overflow-hidden relative">
          {!officer.avatar && (
            <div className="flex items-center justify-center select-none">
              {officer.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
            </div>
          )}
          {officer.avatar && (
            <img
              src={resolveAvatar(officer.avatar)}
              alt={officer.name}
              className="w-full h-full object-cover relative "
              loading="lazy"
              onError={(e)=>{ e.currentTarget.remove(); }}
            />
          )}
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-luxury-gold text-luxury-deep text-xs font-semibold px-3 py-1 rounded-full shadow whitespace-nowrap">
          {officer.position}
        </div>
      </div>
      {officer.subRoles && (
        <div className="flex flex-wrap justify-center gap-2 mt-1 mb-2">
          {officer.subRoles.map((sr,i) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-luxury-gold/15 border border-luxury-gold/40 text-luxury-gold tracking-wide uppercase">{sr}</span>
          ))}
        </div>
      )}
      <h3 className="text-lg font-semibold text-white text-center group-hover:text-luxury-gold transition-colors">{officer.name}</h3>
      <p className="text-center text-sm text-gray-400 mt-1">{officer.course} • {officer.year}</p>
      {officer.achievements && (
        <ul className="mt-3 space-y-1 text-xs text-luxury-gold/80">
          {officer.achievements.map((a,i) => <li key={i} className="flex items-center gap-1"><Award className="h-3 w-3" /> {a}</li>)}
        </ul>
      )}
      <div className="mt-4 pt-4 border-t border-gray-700/60">
        <p className="text-gray-300 italic text-sm flex gap-2"><Quote className="h-4 w-4 text-luxury-gold shrink-0" /> {officer.quote}</p>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header with Carousel */}
        <HeaderCarousel />
        {/* History */}
        <section className="grid md:grid-cols-3 gap-10 items-start">
          <div className="md:col-span-1 flex flex-col items-start gap-4">
            <div className="bg-gradient-to-r from-luxury-gold to-yellow-500 w-14 h-14 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="h-7 w-7 text-luxury-deep" />
            </div>
            <h2 className="text-2xl font-heading font-normal text-white">Our History</h2>
            <p className="text-sm text-luxury-gold/80 uppercase tracking-wider">Evolution & Impact</p>
          </div>
          <div className="md:col-span-2 space-y-5">
            {historyParagraphs.map((p,i) => (
              <p key={i} className="text-gray-300 leading-relaxed">{p}</p>
            ))}
          </div>
         
        </section>

        {/* Officers */}
        <section>
          <div className="flex flex-col items-center gap-6 mb-10">
            <div className="flex flex-col items-center gap-6">
              <h2 className="text-2xl font-heading font-normal text-white mb-2 flex items-center gap-3 text-center">
                <Users className="h-6 w-6 text-luxury-gold" /> Current Officers
              </h2>
              <p className="text-gray-400 max-w-2xl text-center">
                Meet the student leaders driving initiatives, collaboration, and academic excellence across the CCIS community.
              </p>
            </div>
          </div>
          {chairperson && (
            <div className="mb-16">
              <div className="flex justify-center">
                <div className="card-luxury p-8 flex flex-col items-center group hover:shadow-luxury transition-all duration-300 w-full max-w-md relative">
                  <div className="relative mb-8">
                    <div className="w-40 h-40 rounded-full mx-auto bg-gradient-to-br from-luxury-gold/30 to-yellow-500/20 flex items-center justify-center text-luxury-gold text-5xl font-heading overflow-hidden relative">
                      {!chairperson.avatar && (
                        <div className="flex items-center justify-center select-none">
                          {chairperson.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                        </div>
                      )}
                      {chairperson.avatar && (
                        <img
                          src={resolveAvatar(chairperson.avatar)}
                          alt={chairperson.name}
                          className="w-full h-full object-cover relative "
                          loading="lazy"
                          onError={(e)=>{ e.currentTarget.remove(); }}
                        />
                      )}
                    </div>
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-luxury-gold text-luxury-deep text-sm font-semibold px-5 py-1.5 rounded-full shadow whitespace-nowrap">
                      {chairperson.position}
                    </div>
                  </div>
                  {chairperson.subRoles && (
                    <div className="flex flex-wrap justify-center gap-2 mt-2 mb-4">
                      {chairperson.subRoles.map((sr,i) => (
                        <span key={i} className="px-3 py-1 rounded-full text-[11px] font-medium bg-luxury-gold/15 border border-luxury-gold/40 text-luxury-gold tracking-wide uppercase">{sr}</span>
                      ))}
                    </div>
                  )}
                  <h3 className="text-2xl font-semibold text-white text-center group-hover:text-luxury-gold transition-colors">{chairperson.name}</h3>
                  <p className="text-center text-base text-gray-400 mt-2">{chairperson.course} • {chairperson.year}</p>
                  <div className="mt-6 pt-6 border-t border-gray-700/60 w-full">
                    <p className="text-gray-300 italic text-base flex gap-2 justify-center text-center"><Quote className="h-5 w-5 text-luxury-gold shrink-0" /> {chairperson.quote}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {otherOfficers.map(renderOfficerCard)}
          </div>
        </section>

        {/* Values / Pillars */}
        <section className="grid md:grid-cols-3 gap-8">
          <div className="card-luxury p-6 space-y-3">
            <Shield className="h-8 w-8 text-luxury-gold" />
            <h3 className="text-white font-semibold">Student Advocacy</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Upholding student rights, inclusivity, and representation in all academic and organizational dialogues.</p>
          </div>
          <div className="card-luxury p-6 space-y-3">
            <Users className="h-8 w-8 text-luxury-gold" />
            <h3 className="text-white font-semibold">Collaboration</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Fostering a culture of teamwork across departments, organizations, and industry partners.</p>
          </div>
          <div className="card-luxury p-6 space-y-3">
            <Award className="h-8 w-8 text-luxury-gold" />
            <h3 className="text-white font-semibold">Excellence</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Driving academic, technical, and ethical excellence through impactful programs and initiatives.</p>
          </div>
        </section>
      </div>
    </div>
  );
};

// Header Carousel Component
const HeaderCarousel: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<boolean[]>(Array(heroImages.length).fill(false));

  useEffect(() => {
    const id = setInterval(() => {
      setIndex(i => (i + 1) % heroImages.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const goTo = (i: number) => setIndex(i);

  return (
    <section className="relative w-full h-[440px] md:h-[420px] rounded-2xl overflow-hidden shadow-lg">
      {heroImages.map((img: string, i: number) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${i === index ? 'opacity-100 z-10' : 'opacity-0'} bg-luxury-deep`}
        >
          <img
            src={resolveAvatar(img)}
            alt="Council cover"
            className="w-full h-full object-cover object-top"
            onLoad={() => setLoaded(prev => { const n=[...prev]; n[i]=true; return n; })}
          />
          {/* gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-luxury-deep/90" />
        </div>
      ))}
      {/* Text Content */}
      <div className="relative z-20 h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-luxury-gold/80 tracking-wider text-xs md:text-sm font-large mb-2">A.Y. 2025 - 2026</p>
        <h1 className="font-heading font-normal text-white text-3xl md:text-5xl leading-tight drop-shadow-lg">
          CCIS STUDENT COUNCIL
        </h1>
        <p className="mt-5 max-w-3xl text-gray-300 text-sm md:text-lg leading-relaxed">
          Representing the collective voice of the College of Computing Information Sciences – cultivating leadership, innovation, and student empowerment.
        </p>
      </div>
      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30">
        {heroImages.map((_: string, i: number) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-luxury-gold' : 'w-2.5 bg-white/50 hover:bg-white/70'}`}
          />
        ))}
      </div>
      {/* Lazy loading shimmer overlay while images load */}
      {!loaded.every(Boolean) && (
        <div className="absolute inset-0 bg-gradient-to-r from-luxury-night via-luxury-deep to-luxury-night animate-pulse z-0" />
      )}
    </section>
  );
};

const heroImages: string[] = [
  '/cover-photo-officers/cover-photo.jpg',
  '/cover-photo-officers/cover-photo2.jpg',
  '/cover-photo-officers/cover-photo3.jpg',
];

export default Council;
