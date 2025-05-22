
import { useState, useEffect } from "react";
import { TodoFormValues, TodoPriority, Todo } from "@/types/todo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DialogFooter } from "@/components/ui/dialog";
import { getPriorityColor, getPriorityTextColor } from "@/lib/utils/todo-utils";
import { cn } from "@/lib/utils";

interface TodoFormProps {
  initialValues?: Todo;
  onSubmit: (values: TodoFormValues) => void;
  onCancel: () => void;
}

export function TodoForm({ initialValues, onSubmit, onCancel }: TodoFormProps) {
  const [values, setValues] = useState<TodoFormValues>({
    title: initialValues?.title || "",
    description: initialValues?.description || "",
    priority: initialValues?.priority || "medium",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) return;
    onSubmit(values);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handlePriorityChange = (value: string) => {
    setValues((prev) => ({ ...prev, priority: value as TodoPriority }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Task Title</Label>
        <Input
          id="title"
          name="title"
          value={values.title}
          onChange={handleChange}
          placeholder="What needs to be done?"
          required
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          name="description"
          value={values.description}
          onChange={handleChange}
          placeholder="Add details about this task..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Priority</Label>
        <RadioGroup 
          value={values.priority} 
          onValueChange={handlePriorityChange}
          className="flex space-x-2"
        >
          {(['low', 'medium', 'high'] as TodoPriority[]).map((priority) => (
            <div key={priority} className="flex items-center space-x-2">
              <RadioGroupItem 
                value={priority} 
                id={`priority-${priority}`} 
                className={cn(getPriorityColor(priority), "border-0")}
              />
              <Label 
                htmlFor={`priority-${priority}`}
                className="capitalize"
              >
                {priority}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialValues ? 'Update Task' : 'Add Task'}
        </Button>
      </DialogFooter>
    </form>
  );
}
