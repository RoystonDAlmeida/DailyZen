// src/components/AppSidebar.tsx - Sidebar component

import { Home, CheckSquare, Plus, List, LogOut, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { Link, useLocation } from "react-router-dom";
import { Todo } from "@/types/todo";

interface AppSidebarProps {
  onAddTodo: () => void;
  activeTodos: Todo[];
  completedTodos: Todo[];
  activeView: 'all' | 'active' | 'completed';
  setActiveView: (view: 'all' | 'active' | 'completed') => void;
  closeSidebar: () => void; // New prop to close the sidebar
  user: SupabaseUser | null;
  onSignOut: () => Promise<void>;
}

export function AppSidebar({ 
  onAddTodo, 
  activeTodos, 
  completedTodos,
  activeView,
  setActiveView,
  closeSidebar, // Destructure the new prop
  user,
  onSignOut
}: AppSidebarProps) {
  const location = useLocation();
  // const isMobile = useIsMobile(); // We'll use this if needed, but closeSidebar should handle it
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar>
      <SidebarHeader className="flex p-4">
        <div className="flex items-center space-x-2">
          <CheckSquare className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold">Daily Zen</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="px-4 py-2">
          <Button 
            onClick={() => {
              onAddTodo();
              closeSidebar(); // Call closeSidebar on mobile or always if desired
            }} 
            className="w-full justify-start gap-2"
          >
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Views</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => {
                    setActiveView('all');
                    closeSidebar();
                  }}
                  className={activeView === 'all' ? 'bg-sidebar-accent' : ''}
                >
                  <Home className="h-4 w-4" />
                  <span>All Tasks</span>
                  <span className="ml-auto bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                    {activeTodos.length + completedTodos.length}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => {
                    setActiveView('active');
                    closeSidebar();
                  }}
                  className={activeView === 'active' ? 'bg-sidebar-accent' : ''}
                >
                  <List className="h-4 w-4" />
                  <span>Active</span>
                  <span className="ml-auto bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                    {activeTodos.length}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => {
                    setActiveView('completed');
                    closeSidebar();
                  }}
                  className={activeView === 'completed' ? 'bg-sidebar-accent' : ''}
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>Completed</span>
                  <span className="ml-auto bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                    {completedTodos.length}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {user && (
          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Link to="/profile" className="w-full">
                    <SidebarMenuButton
                      onClick={() => {
                        closeSidebar(); // Close sidebar when navigating
                      }}
                      className={isActive('/profile') ? 'bg-sidebar-accent' : ''}
                    >
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <div className="px-3 py-1"> {/* Adjusted padding for consistency */}
                    <div className="flex items-center space-x-2 mb-2 text-sm text-muted-foreground">
                      <span className="truncate">Logged in as: {user.email}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={onSignOut}
                      className="w-full justify-start gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </Button>
                  </div>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
