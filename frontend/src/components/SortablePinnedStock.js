import { Card, CardContent } from '@/components/ui/card';
import { X, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable pinned stock card used in the pinned-stocks horizontal strip
const SortablePinnedStock = ({ stock, onSelect, onUnpin }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stock.ticker });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      data-testid={`pinned-stock-${stock.ticker}`}
      className={`min-w-[150px] sm:min-w-[200px] bg-[rgba(15,15,20,0.95)] border border-[rgba(255,255,255,0.15)] hover:border-[#d946ef]/50 transition-colors duration-200 cursor-pointer flex-shrink-0 shadow-lg ${isDragging ? 'ring-2 ring-[#d946ef]/50' : ''}`}
      onClick={() => onSelect(stock.ticker)}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between">
          <button
            {...attributes}
            {...listeners}
            className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing mr-2 mt-0.5 touch-none"
            onClick={(e) => e.stopPropagation()}
            data-testid={`drag-handle-${stock.ticker}`}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-base sm:text-lg font-bold text-white" style={{ fontFamily: 'DM Mono, monospace' }}>
              {stock.ticker}
            </div>
            <div className="text-xs sm:text-sm text-gray-400 mt-1 line-clamp-1 sm:line-clamp-2">
              {stock.company_name}
            </div>
          </div>
          <button
            data-testid={`unpin-button-${stock.ticker}`}
            onClick={(e) => { e.stopPropagation(); onUnpin(stock.ticker); }}
            className="text-gray-400 hover:text-red-400 transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SortablePinnedStock;
