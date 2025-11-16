
import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import QuestionItem from './QuestionItem';
import { Question } from './types';
import { GripVertical } from 'lucide-react';

interface QuestionListProps {
  questions: Question[];
  onEditQuestion: (question: Question) => void;
  onDeleteQuestion: (questionId: string) => void;
  onReorderQuestions?: (reorderedQuestions: Question[], moduleType?: string) => void;
  moduleType?: string;
}

// Sortable wrapper for QuestionItem
const SortableQuestionItem = ({ 
  question, 
  onEdit, 
  onDelete 
}: { 
  question: Question; 
  onEdit: (question: Question) => void; 
  onDelete: (questionId: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2">
        {/* Only show drag handle for standalone questions (not passage questions) */}
        {!question.passage_id && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-2 text-gray-400 hover:text-gray-600"
            title="Drag to reorder"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1">
          <QuestionItem
            question={question}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
};

const QuestionList = ({ 
  questions, 
  onEditQuestion, 
  onDeleteQuestion,
  onReorderQuestions,
  moduleType
}: QuestionListProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex(q => q.id === active.id);
      const newIndex = questions.findIndex(q => q.id === over.id);

      const reorderedQuestions = arrayMove(questions, oldIndex, newIndex);
      
      if (onReorderQuestions) {
        onReorderQuestions(reorderedQuestions, moduleType);
      }
    }
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-md">
        <p className="text-gray-500">No questions found. Add your first question!</p>
      </div>
    );
  }

  // Filter out passage questions for drag-and-drop (they have their own ordering)
  const standaloneQuestions = questions.filter(q => !q.passage_id);
  const passageQuestions = questions.filter(q => q.passage_id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={standaloneQuestions.map(q => q.id!)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {questions.map((question) => (
            <SortableQuestionItem
              key={question.id}
              question={question}
              onEdit={onEditQuestion}
              onDelete={onDeleteQuestion}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default QuestionList;
