import { useEffect, useRef } from 'react';

// Option 1: Particles with Connections (Original)
export const ParticleNetwork = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    let mouseX = 0, mouseY = 0;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    const createParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width, y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5, speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3, opacity: Math.random() * 0.5 + 0.1,
          hue: Math.random() > 0.7 ? 300 : 280,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(217, 70, 239, ${(1 - dist / 120) * 0.15})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      // Draw and update particles
      particles.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${p.opacity})`; ctx.fill();
        const dx = mouseX - p.x, dy = mouseY - p.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) { const force = (150 - dist) / 150; p.x -= dx * force * 0.02; p.y -= dy * force * 0.02; }
        p.x += p.speedX; p.y += p.speedY;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    const onMouse = (e) => { mouseX = e.clientX; mouseY = e.clientY; };
    resize(); createParticles(); animate();
    window.addEventListener('resize', () => { resize(); createParticles(); });
    window.addEventListener('mousemove', onMouse);
    return () => { cancelAnimationFrame(animationFrameId); window.removeEventListener('resize', resize); window.removeEventListener('mousemove', onMouse); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// Option 2: Floating Orbs / Gradient Blobs
export const FloatingOrbs = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-600/20 to-pink-500/10 blur-3xl animate-float-slow -top-40 -left-40" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-fuchsia-500/15 to-violet-600/10 blur-3xl animate-float-medium top-1/3 right-0" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-pink-400/15 to-purple-700/10 blur-3xl animate-float-fast bottom-0 left-1/4" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-gradient-to-r from-violet-500/10 to-fuchsia-400/15 blur-2xl animate-float-reverse top-20 right-1/3" />
    </div>
  );
};

// Option 3: Subtle Grid with Glow
export const GridGlow = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(217, 70, 239, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(217, 70, 239, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Radial glow in center */}
      <div className="absolute inset-0 bg-gradient-radial from-purple-500/5 via-transparent to-transparent" />
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-fuchsia-500/10 to-transparent blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-500/10 to-transparent blur-3xl" />
    </div>
  );
};

// Option 4: Starfield / Space Theme
export const Starfield = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let stars = [];

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    const createStars = () => {
      stars = [];
      const count = Math.floor((canvas.width * canvas.height) / 3000);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width, y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.3,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          twinklePhase: Math.random() * Math.PI * 2,
          color: Math.random() > 0.8 ? '#d946ef' : Math.random() > 0.5 ? '#a855f7' : '#ffffff',
        });
      }
    };

    let time = 0;
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      stars.forEach(s => {
        const twinkle = Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.5 + 0.5;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size * twinkle, 0, Math.PI * 2);
        ctx.fillStyle = s.color; ctx.globalAlpha = 0.3 + twinkle * 0.7;
        ctx.fill(); ctx.globalAlpha = 1;
      });
      
      // Occasional shooting star
      if (Math.random() < 0.002) {
        const sx = Math.random() * canvas.width, sy = Math.random() * canvas.height * 0.5;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 100, sy + 50);
        ctx.strokeStyle = 'rgba(217, 70, 239, 0.6)'; ctx.lineWidth = 2; ctx.stroke();
      }
      
      time++; animationFrameId = requestAnimationFrame(animate);
    };

    resize(); createStars(); animate();
    window.addEventListener('resize', () => { resize(); createStars(); });
    return () => { cancelAnimationFrame(animationFrameId); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ background: 'transparent' }} />;
};

// Option 5: Minimal Gradient Waves
export const GradientWaves = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 1920 1080" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d946ef" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#d946ef" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="wave2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#ec4899" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path className="animate-wave-slow" fill="url(#wave1)" d="M0,600 C320,500 640,700 960,600 C1280,500 1600,700 1920,600 L1920,1080 L0,1080 Z" />
        <path className="animate-wave-medium" fill="url(#wave2)" d="M0,700 C320,800 640,600 960,700 C1280,800 1600,600 1920,700 L1920,1080 L0,1080 Z" />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
    </div>
  );
};

// Default export map for easy selection
const backgrounds = {
  particles: ParticleNetwork,
  orbs: FloatingOrbs,
  grid: GridGlow,
  stars: Starfield,
  waves: GradientWaves,
};

export default backgrounds;
