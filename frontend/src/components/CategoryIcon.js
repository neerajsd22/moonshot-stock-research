import { BrainCircuit, Cpu } from 'lucide-react';

// Lucide icon mapping for categories
export const LUCIDE_ICONS = {
  BrainCircuit,
  Cpu,
};

// Helper to render category icon (string emoji or Lucide icon key)
const CategoryIcon = ({ icon, isLucide, className = "text-2xl sm:text-4xl mb-1 sm:mb-3" }) => {
  if (isLucide && LUCIDE_ICONS[icon]) {
    const IconComponent = LUCIDE_ICONS[icon];
    return (
      <div className={className}>
        <IconComponent className="w-7 h-7 sm:w-10 sm:h-10 text-primary mx-auto" />
      </div>
    );
  }
  return <div className={className}>{icon}</div>;
};

export default CategoryIcon;
