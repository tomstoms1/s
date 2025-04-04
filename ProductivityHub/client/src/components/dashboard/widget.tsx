import React, { ReactNode, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Grip, MoreVertical, PaintBucket, Maximize, Minimize } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Widget as WidgetType } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Widget color themes
const widgetColorThemes = {
  default: {
    header: "bg-white",
    headerBorder: "border-b",
    headerText: "text-slate-900",
    content: "bg-white",
    footer: "bg-slate-50 border-t",
    card: "border shadow-sm"
  },
  blue: {
    header: "bg-blue-50",
    headerBorder: "border-b border-blue-100",
    headerText: "text-blue-800",
    content: "bg-white",
    footer: "bg-blue-50 border-t border-blue-100",
    card: "border border-blue-200 shadow-sm"
  },
  green: {
    header: "bg-emerald-50",
    headerBorder: "border-b border-emerald-100",
    headerText: "text-emerald-800",
    content: "bg-white",
    footer: "bg-emerald-50 border-t border-emerald-100",
    card: "border border-emerald-200 shadow-sm"
  },
  amber: {
    header: "bg-amber-50",
    headerBorder: "border-b border-amber-100",
    headerText: "text-amber-800",
    content: "bg-white",
    footer: "bg-amber-50 border-t border-amber-100",
    card: "border border-amber-200 shadow-sm"
  },
  red: {
    header: "bg-red-50",
    headerBorder: "border-b border-red-100",
    headerText: "text-red-800",
    content: "bg-white",
    footer: "bg-red-50 border-t border-red-100",
    card: "border border-red-200 shadow-sm"
  },
  purple: {
    header: "bg-purple-50",
    headerBorder: "border-b border-purple-100",
    headerText: "text-purple-800",
    content: "bg-white",
    footer: "bg-purple-50 border-t border-purple-100", 
    card: "border border-purple-200 shadow-sm"
  },
  gray: {
    header: "bg-gray-50",
    headerBorder: "border-b border-gray-100",
    headerText: "text-gray-800",
    content: "bg-white",
    footer: "bg-gray-50 border-t border-gray-100",
    card: "border border-gray-200 shadow-sm"
  }
};

export interface WidgetProps {
  id: number;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  onRemove?: (id: number) => void;
  onRefresh?: (id: number) => void;
  onEdit?: (id: number) => void;
  isDraggable?: boolean;
  dragHandleProps?: any;
  colorTheme?: string;
  size?: 'normal' | 'large';
}

export function Widget({
  id,
  title,
  icon,
  children,
  footer,
  className,
  onRemove,
  onRefresh,
  onEdit,
  isDraggable = true,
  dragHandleProps,
  colorTheme = 'default',
  size = 'normal'
}: WidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get theme object or default theme if not found
  const theme = widgetColorThemes[colorTheme as keyof typeof widgetColorThemes] || widgetColorThemes.default;
  
  // Mutation for updating widget appearance
  const updateWidgetMutation = useMutation({
    mutationFn: async (updates: { colorTheme?: string, size?: string }) => {
      const res = await apiRequest('PATCH', `/api/widgets/${id}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/widgets'] });
      toast({
        title: "Widget updated",
        description: "Widget appearance has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update widget: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const handleColorChange = (color: string) => {
    updateWidgetMutation.mutate({ id, colorTheme: color });
  };
  
  const toggleWidgetSize = () => {
    const newSize = size === 'normal' ? 'large' : 'normal';
    updateWidgetMutation.mutate({ size: newSize });
    setIsExpanded(newSize === 'large');
  };
  
  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all rounded-md", 
        theme.card,
        size === 'large' ? 'col-span-2' : '',
        className
      )}
    >
      <CardHeader className={cn(
        "p-4 flex flex-row items-center justify-between space-y-0", 
        theme.header, 
        theme.headerBorder
      )}>
        <div className="flex items-center">
          {icon && <div className="mr-2 text-slate-500">{icon}</div>}
          <h2 className={cn("font-semibold text-lg", theme.headerText)}>{title}</h2>
        </div>
        <div className="flex items-center">
          {isDraggable && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="p-1 text-slate-400 hover:text-slate-600 cursor-move"
              {...dragHandleProps}
            >
              <Grip className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(id)}>
                  Edit
                </DropdownMenuItem>
              )}
              {onRefresh && (
                <DropdownMenuItem onClick={() => onRefresh(id)}>
                  Refresh
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <PaintBucket className="mr-2 h-4 w-4" />
                  <span>Change Color</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={colorTheme} onValueChange={handleColorChange}>
                      <DropdownMenuRadioItem value="default">Default</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="blue">Blue</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="green">Green</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="amber">Amber</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="red">Red</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="purple">Purple</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="gray">Gray</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              
              <DropdownMenuItem onClick={toggleWidgetSize}>
                {size === 'normal' ? (
                  <>
                    <Maximize className="mr-2 h-4 w-4" />
                    <span>Expand Widget</span>
                  </>
                ) : (
                  <>
                    <Minimize className="mr-2 h-4 w-4" />
                    <span>Shrink Widget</span>
                  </>
                )}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {onRemove && (
                <DropdownMenuItem 
                  onClick={() => onRemove(id)} 
                  className="text-red-500 focus:text-red-500"
                >
                  Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className={cn("p-4 overflow-auto", theme.content, size === 'large' ? 'max-h-[500px]' : 'max-h-[350px]')}>
        {children}
      </CardContent>
      
      {footer && (
        <CardFooter className={cn("p-3 text-center", theme.footer)}>
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
