import { useEffect, useRef } from 'react';

// Option 1: Particles with Connections (Original - KEEP)
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

// Option A: Aurora Borealis - Slow-moving northern lights effect
export const AuroraBorealis = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    const resize = () => { 
      canvas.width = window.innerWidth; 
      canvas.height = window.innerHeight; 
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create multiple aurora layers
      for (let layer = 0; layer < 3; layer++) {
        const layerOffset = layer * 0.3;
        const yOffset = canvas.height * (0.2 + layer * 0.15);
        
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        
        for (let x = 0; x <= canvas.width; x += 10) {
          const y = yOffset + 
            Math.sin((x * 0.003) + time * 0.01 + layerOffset) * 80 +
            Math.sin((x * 0.007) + time * 0.015 + layerOffset) * 40 +
            Math.sin((x * 0.001) + time * 0.005) * 60;
          ctx.lineTo(x, y);
        }
        
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, yOffset - 100, 0, canvas.height);
        if (layer === 0) {
          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.08)');
          gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.05)');
          gradient.addColorStop(1, 'transparent');
        } else if (layer === 1) {
          gradient.addColorStop(0, 'rgba(217, 70, 239, 0.06)');
          gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.04)');
          gradient.addColorStop(1, 'transparent');
        } else {
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.05)');
          gradient.addColorStop(0.5, 'rgba(217, 70, 239, 0.03)');
          gradient.addColorStop(1, 'transparent');
        }
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      time++;
      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener('resize', resize);
    return () => { 
      cancelAnimationFrame(animationFrameId); 
      window.removeEventListener('resize', resize); 
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// Option B: Matrix Rain - Subtle falling code/numbers (finance-themed)
export const MatrixRain = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => { 
      canvas.width = window.innerWidth; 
      canvas.height = window.innerHeight; 
    };

    resize();
    
    const chars = '0123456789$€£¥%+-×÷=<>αβγδ∑∏∫'.split('');
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);
    const speeds = Array(columns).fill(0).map(() => Math.random() * 0.5 + 0.2);

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = `${fontSize}px monospace`;
      
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        
        // Gradient effect - brighter at head
        const alpha = Math.random() * 0.08 + 0.02;
        const hue = Math.random() > 0.8 ? 280 : 160; // Purple or green
        ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${alpha})`;
        ctx.fillText(char, x, y);
        
        if (y > canvas.height && Math.random() > 0.98) {
          drops[i] = 0;
        }
        drops[i] += speeds[i];
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    window.addEventListener('resize', resize);
    return () => { 
      cancelAnimationFrame(animationFrameId); 
      window.removeEventListener('resize', resize); 
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.7 }} />;
};

// Option C: Bokeh Blur - Out-of-focus light circles
export const BokehBlur = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let bokehCircles = [];

    const resize = () => { 
      canvas.width = window.innerWidth; 
      canvas.height = window.innerHeight;
      createBokeh();
    };

    const createBokeh = () => {
      bokehCircles = [];
      const count = Math.floor((canvas.width * canvas.height) / 40000);
      for (let i = 0; i < count; i++) {
        bokehCircles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 80 + 30,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.2,
          hue: Math.random() > 0.6 ? 280 + Math.random() * 40 : 200 + Math.random() * 60,
          opacity: Math.random() * 0.06 + 0.02,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.02 + 0.005,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      bokehCircles.forEach(b => {
        b.pulse += b.pulseSpeed;
        const pulseFactor = Math.sin(b.pulse) * 0.3 + 1;
        const currentSize = b.size * pulseFactor;
        
        const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, currentSize);
        gradient.addColorStop(0, `hsla(${b.hue}, 60%, 60%, ${b.opacity * 1.5})`);
        gradient.addColorStop(0.5, `hsla(${b.hue}, 60%, 50%, ${b.opacity * 0.5})`);
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(b.x, b.y, currentSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        b.x += b.speedX;
        b.y += b.speedY;
        
        if (b.x < -b.size) b.x = canvas.width + b.size;
        if (b.x > canvas.width + b.size) b.x = -b.size;
        if (b.y < -b.size) b.y = canvas.height + b.size;
        if (b.y > canvas.height + b.size) b.y = -b.size;
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener('resize', resize);
    return () => { 
      cancelAnimationFrame(animationFrameId); 
      window.removeEventListener('resize', resize); 
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// Option D: Noise Gradient - Static grainy texture with subtle color shifts
export const NoiseGradient = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    const resize = () => { 
      canvas.width = window.innerWidth; 
      canvas.height = window.innerHeight; 
    };

    const animate = () => {
      // Create gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width * 0.3 + Math.sin(time * 0.005) * 100,
        canvas.height * 0.3 + Math.cos(time * 0.007) * 50,
        0,
        canvas.width * 0.5,
        canvas.height * 0.5,
        canvas.width * 0.8
      );
      gradient.addColorStop(0, 'rgba(139, 92, 246, 0.08)');
      gradient.addColorStop(0.5, 'rgba(217, 70, 239, 0.04)');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add noise
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 15;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      time++;
      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener('resize', resize);
    return () => { 
      cancelAnimationFrame(animationFrameId); 
      window.removeEventListener('resize', resize); 
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.6 }} />;
};

// Option E: Mesh Gradient - Smooth animated color blobs (modern SaaS look)
export const MeshGradient = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    const blobs = [
      { x: 0.2, y: 0.3, size: 0.4, hue: 280, speedX: 0.0003, speedY: 0.0002 },
      { x: 0.7, y: 0.2, size: 0.35, hue: 320, speedX: -0.0002, speedY: 0.0003 },
      { x: 0.5, y: 0.7, size: 0.45, hue: 260, speedX: 0.0002, speedY: -0.0002 },
      { x: 0.8, y: 0.6, size: 0.3, hue: 200, speedX: -0.0003, speedY: -0.0001 },
    ];

    const resize = () => { 
      canvas.width = window.innerWidth; 
      canvas.height = window.innerHeight; 
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      blobs.forEach(blob => {
        blob.x += blob.speedX + Math.sin(time * 0.001) * 0.0001;
        blob.y += blob.speedY + Math.cos(time * 0.001) * 0.0001;
        
        // Bounce off edges
        if (blob.x < 0 || blob.x > 1) blob.speedX *= -1;
        if (blob.y < 0 || blob.y > 1) blob.speedY *= -1;
        
        const x = blob.x * canvas.width;
        const y = blob.y * canvas.height;
        const size = blob.size * Math.min(canvas.width, canvas.height);
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, `hsla(${blob.hue}, 70%, 50%, 0.12)`);
        gradient.addColorStop(0.4, `hsla(${blob.hue}, 60%, 40%, 0.06)`);
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });
      
      time++;
      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener('resize', resize);
    return () => { 
      cancelAnimationFrame(animationFrameId); 
      window.removeEventListener('resize', resize); 
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ filter: 'blur(60px)' }} />;
};

// Default export map
const backgrounds = {
  particles: ParticleNetwork,
  aurora: AuroraBorealis,
  matrix: MatrixRain,
  bokeh: BokehBlur,
  noise: NoiseGradient,
  mesh: MeshGradient,
};

export default backgrounds;
