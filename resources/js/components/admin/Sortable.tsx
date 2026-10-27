import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVerticalIcon } from 'lucide-react';
import { createContext, useContext, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Sortable = ReturnType<typeof useSortable>;

const HandleContext = createContext<Pick<Sortable, 'attributes' | 'listeners' | 'setActivatorNodeRef'> | null>(null);

/** Vertical drag-and-drop list; children are SortableItem elements with the same ids. */
export function SortableList({ ids, onMove, children }: { ids: (string | number)[]; onMove: (from: number, to: number) => void; children: ReactNode }) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    function handleDragEnd({ active, over }: DragEndEvent) {
        if (over && active.id !== over.id) {
            onMove(ids.indexOf(active.id), ids.indexOf(over.id));
        }
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {children}
            </SortableContext>
        </DndContext>
    );
}

export function SortableItem({ id, className, children }: { id: string | number; className?: string; children: ReactNode }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cn('relative', isDragging && 'z-10 opacity-80 shadow-lg', className)}
        >
            <HandleContext.Provider value={{ attributes, listeners, setActivatorNodeRef }}>{children}</HandleContext.Provider>
        </div>
    );
}

export function DragHandle({ label = 'Arrastrar para reordenar' }: { label?: string }) {
    const handle = useContext(HandleContext);

    return (
        <Button
            ref={handle?.setActivatorNodeRef}
            type="button"
            variant="ghost"
            size="icon-sm"
            className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            {...handle?.attributes}
            {...handle?.listeners}
            aria-label={label}
        >
            <GripVerticalIcon />
        </Button>
    );
}
