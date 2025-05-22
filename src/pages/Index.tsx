
import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TodoItem } from "@/components/TodoItem";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TodoForm } from "@/components/TodoForm";
import { Todo, TodoFormValues } from "@/types/todo";
import { Button } from "@/components/ui/button";
import { Plus, CheckSquare, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseTodos } from "@/hooks/use-supabase-todos";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { SlackSummarize } from "@/components/SlackSummarize";

const Index = () => {
  const { 
    todos, 
    isLoading, 
    addTodo, 
    editTodo, 
    toggleComplete, 
    deleteTodo,
    getActiveTodos,
    getCompletedTodos 
  } = useSupabaseTodos();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTodo, setActiveTodo] = useState<Todo | undefined>(undefined);
  const [activeView, setActiveView] = useState<'all' | 'active' | 'completed'>('all');
  
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  
  const activeTodos = getActiveTodos();
  const completedTodos = getCompletedTodos();
  
  const handleAddTodo = () => {
    setActiveTodo(undefined);
    setIsFormOpen(true);
  };
  
  const handleEditTodo = (todo: Todo) => {
    setActiveTodo(todo);
    setIsFormOpen(true);
  };
  
  const handleDeleteTodo = (id: string) => {
    deleteTodo(id);
  };
  
  const handleSubmit = async (values: TodoFormValues) => {
    if (activeTodo) {
      await editTodo(activeTodo.id, values);
    } else {
      await addTodo(values);
    }
    setIsFormOpen(false);
  };
  
  const displayedTodos = 
    activeView === 'all' ? [...activeTodos, ...completedTodos] : 
    activeView === 'active' ? activeTodos : completedTodos;
  
  return (
    <div className="min-h-screen flex">
      <SidebarProvider>
        <AppSidebar 
          onAddTodo={handleAddTodo} 
          activeTodos={activeTodos} 
          completedTodos={completedTodos}
          activeView={activeView}
          setActiveView={setActiveView}
          user={user}
          onSignOut={signOut}
        />
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden"> {/* Reduced padding on mobile, ensure no overflow */}
          <div className="max-w-4xl mx-auto"> {/* Replaces container for more control */}
            <header className="flex items-center mb-6 border-b border-border pb-4 w-full"> {/* Ensure header takes full width */}
              {isMobile && (
                <SidebarTrigger className="mr-3 h-10 w-10" />
              )}
              <div className={`flex-1 flex flex-wrap ${isMobile ? 'flex-col items-start' : 'justify-between items-center'} gap-y-2`}>
                <div className={`${isMobile ? 'w-full' : ''}`}> {/* Ensure text block takes full width on mobile if needed */}
                  <h1 className="text-3xl font-bold">
                    {activeView === 'all' ? 'All Tasks' : 
                     activeView === 'active' ? 'Active Tasks' : 'Completed Tasks'}
                  </h1>
                  <p className="text-muted-foreground">
                    {activeView === 'all' 
                      ? `${todos.length} tasks total (${activeTodos.length} active, ${completedTodos.length} completed)`
                      : activeView === 'active'
                      ? `${activeTodos.length} active tasks`
                      : `${completedTodos.length} completed tasks`}
                  </p>
                </div>
                <div className={`flex items-center gap-3 ${isMobile ? 'mt-4 w-full justify-start' : ''}`}>
                  <SlackSummarize />
                  <Button onClick={handleAddTodo}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </div>
            </header>
            
            {!isMobile && (
              <div className="my-6">
                <SidebarTrigger className="h-10 w-10" />
              </div>
            )}
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-12 w-12 mb-4 animate-spin" />
                <h3 className="text-lg font-medium">Loading tasks...</h3>
              </div>
            ) : displayedTodos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-medium">No tasks found</h3>
                <p className="mb-6">
                  {activeView === 'all' 
                    ? "You don't have any tasks yet."
                    : activeView === 'active'
                    ? "You don't have any active tasks."
                    : "You don't have any completed tasks."}
                </p>
                <Button onClick={handleAddTodo}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {displayedTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggleComplete={toggleComplete}
                    onEdit={handleEditTodo}
                    onDelete={handleDeleteTodo}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {activeTodo ? 'Edit Task' : 'Add New Task'}
              </DialogTitle>
            </DialogHeader>
            <TodoForm
              initialValues={activeTodo}
              onSubmit={handleSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    </div>
  );
};

export default Index;
