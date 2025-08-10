import React from 'react';

type AuthCarouselImage = {
  src: string;
  alt: string;
  caption?: string;
};

interface AuthCarouselProps {
  images: AuthCarouselImage[];
  intervalMs?: number;
  showIndicators?: boolean;
  className?: string;
  rounded?: boolean;
}

const AuthCarousel: React.FC<AuthCarouselProps> = ({
  images,
  intervalMs = 4000,
  showIndicators = true,
  className = '',
  rounded = true,
}) => {
  const [index, setIndex] = React.useState(0);
  const timerRef = React.useRef<number | null>(null);

  const start = React.useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);
  }, [images.length, intervalMs]);

  const stop = React.useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (images.length <= 1) return;
    start();
    return () => stop();
  }, [images.length, start, stop]);

  if (!images.length) return null;

  return (
    <div
      className={[
        'relative h-[420px] sm:h-[460px] md:h-[520px] w-full overflow-hidden bg-luxury-deep/40 border border-luxury-gold/20 shadow-xl',
        rounded ? 'rounded-2xl' : '',
        className,
      ].join(' ')}
      onMouseEnter={stop}
      onMouseLeave={start}
      aria-roledescription="carousel"
    >
      {/* Slides */}
      {images.map((img, i) => (
        <div
          key={i}
          className={[
            'absolute inset-0 transition-opacity duration-700 ease-out',
            i === index ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
          aria-hidden={i !== index}
        >
          {/* Background image */}
          <img
            src={img.src}
            alt={img.alt}
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* Overlay gradient and caption */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          {img.caption && (
            <div className="absolute bottom-6 left-6 right-6">
              <p className="text-white/90 text-lg font-medium drop-shadow-sm">{img.caption}</p>
            </div>
          )}
        </div>
      ))}

      {/* Indicators */}
      {showIndicators && images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={[
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-8 bg-white/90' : 'w-3 bg-white/50 hover:bg-white/70',
              ].join(' ')}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AuthCarousel;
