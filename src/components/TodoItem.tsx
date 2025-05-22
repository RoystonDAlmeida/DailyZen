// src/components/TodoItem.tsx - component for todo item box(with title and description)

import { Todo } from "@/types/todo";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { formatDate, getPriorityColor, getPriorityTextColor } from "@/lib/utils/todo-utils";
import { Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TodoItemProps {
  todo: Todo;
  onToggleComplete: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onToggleComplete, onEdit, onDelete }: TodoItemProps) {
  const priorityColor = getPriorityColor(todo.priority);
  const priorityTextColor = getPriorityTextColor(todo.priority);

  return (
    <div 
      className={cn(
        "p-4 border rounded-md shadow-sm mb-3 transition-all duration-200 animate-fade-in group",
        todo.completed ? "bg-todo-complete/20 border-todo-complete" : "bg-white hover:shadow-md"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox 
          checked={todo.completed} 
          onCheckedChange={() => onToggleComplete(todo.id)} 
          className="mt-1"
        />
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              "text-lg font-medium transition-all",
              todo.completed && "line-through text-muted-foreground"
            )}>
              {todo.title}
            </h3>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              priorityColor,
              priorityTextColor
            )}>
              {todo.priority}
            </span>
          </div>
          
          {todo.description && (
            <p className={cn(
              "text-sm text-muted-foreground my-1",
              todo.completed && "line-through"
            )}>
              {todo.description}
            </p>
          )}
          
          <div className="text-xs text-muted-foreground mt-2">
            {formatDate(todo.updated_at)}
          </div>
        </div>
        
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={() => onEdit(todo)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(todo.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
