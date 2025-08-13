
"use client";

import type { Place, Transition, Arc, Point } from "@/types/petri";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MousePointer,
  Circle,
  RectangleHorizontal,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  Share2,
  Play,
  Pause,
  Settings2,
  FileText,
  Type,
  Hash,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";

type Tool = "select" | "place" | "transition" | "arc";
type NetworkElement = Place | Transition;

const PLACE_RADIUS = 30;
const TRANSITION_WIDTH = 60;
const TRANSITION_HEIGHT = 20;

const getInitialElements = (): Map<string, NetworkElement> => {
  const initialElements = new Map<string, NetworkElement>();
  initialElements.set('p1', { id: 'p1', type: 'place', position: { x: 150, y: 150 }, name: 'Client Ready', tokens: 1 });
  initialElements.set('p2', { id: 'p2', type: 'place', position: { x: 350, y: 150 }, name: 'Discover Sent', tokens: 0 });
  initialElements.set('p3', { id: 'p3', type: 'place', position: { x: 550, y: 150 }, name: 'Offer Received', tokens: 0 });
  initialElements.set('p4', { id: 'p4', type: 'place', position: { x: 750, y: 150 }, name: 'Request Sent', tokens: 0 });
  initialElements.set('p5', { id: 'p5', type: 'place', position: { x: 950, y: 150 }, name: 'Leased', tokens: 0 });
  initialElements.set('p6', { id: 'p6', type: 'place', position: { x: 550, y: 350 }, name: 'Available IPs', tokens: 5 });
  initialElements.set('p7', { id: 'p7', type: 'place', position: { x: 750, y: 350 }, name: 'Reserved IPs', tokens: 0 });
  
  initialElements.set('t1', { id: 't1', type: 'transition', position: { x: 250, y: 150 }, name: 'Discover', isFirable: false });
  initialElements.set('t2', { id: 't2', type: 'transition', position: { x: 450, y: 250 }, name: 'Offer', isFirable: false });
  initialElements.set('t3', { id: 't3', type: 'transition', position: { x: 650, y: 150 }, name: 'Request', isFirable: false });
  initialElements.set('t4', { id: 't4', type: 'transition', position: { x: 850, y: 250 }, name: 'Acknowledge', isFirable: false });

  return initialElements;
}

const getInitialArcs = (): Map<string, Arc> => {
    const initialArcs = new Map<string, Arc>();
    initialArcs.set('a1', { id: 'a1', sourceId: 'p1', destinationId: 't1' });
    initialArcs.set('a2', { id: 'a2', sourceId: 't1', destinationId: 'p2' });
    initialArcs.set('a3', { id: 'a3', sourceId: 'p2', destinationId: 't2' });
    initialArcs.set('a4', { id: 'a4', sourceId: 'p6', destinationId: 't2' });
    initialArcs.set('a5', { id: 'a5', sourceId: 't2', destinationId: 'p3' });
    initialArcs.set('a6', { id: 'a6', sourceId: 't2', destinationId: 'p7' });
    initialArcs.set('a7', { id: 'a7', sourceId: 'p3', destinationId: 't3' });
    initialArcs.set('a8', { id: 'a8', sourceId: 't3', destinationId: 'p4' });
    initialArcs.set('a9', { id: 'a9', sourceId: 'p4', destinationId: 't4' });
    initialArcs.set('a10', { id: 'a10', sourceId: 'p7', destinationId: 't4' });
    initialArcs.set('a11', { id: 'a11', sourceId: 't4', destinationId: 'p5' });
    return initialArcs;
}

const PropertyDisplay = ({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) => (
    <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span>{label}</span>
        </div>
        <span className="font-medium text-foreground">{value}</span>
    </div>
);


export default function PetriNetEditor() {
  const [elements, setElements] = useState<Map<string, NetworkElement>>(
    new Map()
  );
  const [arcs, setArcs] = useState<Map<string, Arc>>(new Map());
  const [tool, setTool] = useState<Tool>("select");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null
  );

  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const [draggingElementId, setDraggingElementId] = useState<string | null>(
    null
  );
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  const [arcStartState, setArcStartState] = useState<{
    id: string;
    pos: Point;
  } | null>(null);
  const [mousePosition, setMousePosition] = useState<Point>({ x: 0, y: 0 });
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getElement = (id: string | null) =>
    id ? elements.get(id) : undefined;
  const selectedElement = getElement(selectedElementId);

  const resetDiagram = useCallback(() => {
    setIsSimulating(false);
    setElements(getInitialElements());
    setArcs(getInitialArcs());
    setSelectedElementId(null);
  }, []);

  useEffect(() => {
    resetDiagram();
  }, [resetDiagram]);

  const updateElement = (id: string, updates: Partial<NetworkElement>) => {
    setElements((prev) => {
      const newElements = new Map(prev);
      const el = newElements.get(id);
      if (el) {
        newElements.set(id, { ...el, ...updates });
      }
      return newElements;
    });
  };

  const updateArc = (id: string, updates: Partial<Arc>) => {
    setArcs((prev) => {
      const newArcs = new Map(prev);
      const arc = newArcs.get(id);
      if (arc) {
        newArcs.set(id, { ...arc, ...updates });
      }
      return newArcs;
    });
  };

  const checkFirable = useCallback(() => {
    const transitionsToUpdate = new Map<string, Partial<Transition>>();

    for (const el of elements.values()) {
      if (el.type === "transition") {
        const incomingArcs = Array.from(arcs.values()).filter(
          (arc) => arc.destinationId === el.id
        );
        let isFirable = incomingArcs.length > 0;
        for (const arc of incomingArcs) {
          const source = getElement(arc.sourceId);
          if (source?.type !== "place" || source.tokens === 0) {
            isFirable = false;
            break;
          }
        }
        if (el.isFirable !== isFirable) {
            transitionsToUpdate.set(el.id, { isFirable });
        }
      }
    }
    
    if (transitionsToUpdate.size > 0) {
        setElements(prev => {
            const newElements = new Map(prev);
            transitionsToUpdate.forEach((updates, id) => {
                const el = newElements.get(id) as Transition;
                newElements.set(id, { ...el, ...updates });
            });
            return newElements;
        });
    }
  }, [elements, arcs]);

  useEffect(() => {
    checkFirable();
  }, [elements, arcs, checkFirable]);
  
  const fireTransition = (transitionId: string) => {
    const transition = getElement(transitionId);
    if (!transition || transition.type !== 'transition' || !transition.isFirable) return;

    const incoming = Array.from(arcs.values()).filter(arc => arc.destinationId === transitionId);
    const outgoing = Array.from(arcs.values()).filter(arc => arc.sourceId === transitionId);
    
    setElements(prev => {
        const newElements = new Map(prev);
        
        incoming.forEach(arc => {
            const place = newElements.get(arc.sourceId) as Place;
            if (place && place.type === 'place') {
                newElements.set(arc.sourceId, {...place, tokens: Math.max(0, place.tokens - 1)});
            }
        });

        outgoing.forEach(arc => {
            const place = newElements.get(arc.destinationId) as Place;
            if (place && place.type === 'place') {
                 newElements.set(arc.destinationId, {...place, tokens: place.tokens + 1});
            }
        });

        return newElements;
    });
  }

  const runSimulationStep = useCallback(() => {
    const firableTransitions = Array.from(elements.values()).filter(
        (el): el is Transition => el.type === 'transition' && el.isFirable
    );

    if (firableTransitions.length === 0) {
        setIsSimulating(false); // Stop simulation if nothing can be fired
        return;
    }

    const randomIndex = Math.floor(Math.random() * firableTransitions.length);
    fireTransition(firableTransitions[randomIndex].id);
  }, [elements]);

  useEffect(() => {
    if (isSimulating) {
        simulationIntervalRef.current = setInterval(runSimulationStep, 1000);
    } else {
        if (simulationIntervalRef.current) {
            clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
        }
    }

    return () => {
        if (simulationIntervalRef.current) {
            clearInterval(simulationIntervalRef.current);
        }
    };
  }, [isSimulating, runSimulationStep]);


  const getSVGPoint = (e: React.MouseEvent): Point => {
    const pt = svgRef.current?.createSVGPoint();
    if (pt) {
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svgRef.current?.getScreenCTM()?.inverse());
      return { x: svgP.x, y: svgP.y };
    }
    return { x: 0, y: 0 };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== svgRef.current) return;
    if (editingElementId) {
        const element = getElement(editingElementId);
        if(element) updateElement(editingElementId, { name: editingValue });
        setEditingElementId(null);
        return;
    }
    setSelectedElementId(null);
    if(tool === 'select') return;
    
    const { x, y } = getSVGPoint(e);
    const id = `el_${Date.now()}`;
    let newElement: NetworkElement | null = null;
    
    if (tool === 'place') {
        newElement = { id, type: 'place', position: { x, y }, name: `P${elements.size + 1}`, tokens: 0 };
    } else if (tool === 'transition') {
        newElement = { id, type: 'transition', position: { x, y }, name: `T${elements.size + 1}`, isFirable: false };
    }
    
    if (newElement) {
      setElements((prev) => new Map(prev).set(id, newElement!));
      setSelectedElementId(id);
      setTool('select');
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const pos = getSVGPoint(e);
    const element = getElement(id);
    if (!element) return;
    
    if (tool === "select") {
      setDraggingElementId(id);
      setDragOffset({ x: pos.x - element.position.x, y: pos.y - element.position.y });
    } else if (tool === "arc") {
      if (!arcStartState) {
        setArcStartState({ id, pos: element.position });
      } else {
        const source = getElement(arcStartState.id);
        const destination = element;
        if(source && destination && source.id !== destination.id && source.type !== destination.type){
            const newArc: Arc = { id: `arc_${Date.now()}`, sourceId: source.id, destinationId: destination.id};
            setArcs(prev => new Map(prev).set(newArc.id, newArc));
        }
        setArcStartState(null);
      }
    }
    setSelectedElementId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getSVGPoint(e);
    setMousePosition(pos);
    if (draggingElementId) {
      updateElement(draggingElementId, {
        position: { x: pos.x - dragOffset.x, y: pos.y - dragOffset.y },
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingElementId(null);
  };
  
  const handleDoubleClick = (id: string) => {
      const el = getElement(id);
      if(el) {
          setEditingElementId(id);
          setEditingValue(el.name);
      }
  }
  
  useEffect(() => {
    if (editingElementId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingElementId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditingValue(e.target.value);
  }

  const handleInputBlur = () => {
      if(editingElementId) {
          const el = getElement(editingElementId);
          if(el) updateElement(editingElementId, { name: editingValue });
      }
      setEditingElementId(null);
  }
  
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };


  const changeTokens = (amount: number) => {
    if (selectedElement?.type === 'place') {
        const newTokens = Math.max(0, selectedElement.tokens + amount);
        updateElement(selectedElement.id, { tokens: newTokens });
    }
  }

  const clearAll = () => {
    setIsSimulating(false);
    setElements(new Map());
    setArcs(new Map());
    setSelectedElementId(null);
    setArcStartState(null);
    setEditingElementId(null);
  }

  const ToolButton = ({ value, icon, label }: { value: Tool, icon: React.ReactNode, label: string }) => (
    <Button
      onClick={() => { setTool(value); if (value === 'arc') setArcStartState(null); }}
      variant={tool === value ? "secondary" : "ghost"}
      className="justify-start w-full"
    >
      {icon} {label}
    </Button>
  );

  return (
    <SidebarProvider>
    <div className="flex h-screen w-full bg-background font-body text-foreground overflow-hidden">
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center gap-2 p-2">
                    <Share2 className="text-primary" />
                    <h1 className="text-xl font-bold text-primary">PetriPainter</h1>
                </div>
            </SidebarHeader>
            <SidebarContent className="p-0">
                <SidebarGroup>
                    <SidebarGroupLabel className="flex items-center"><Settings2 className="mr-2"/>Controls</SidebarGroupLabel>
                    <div className="grid gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
                                    <MousePointer className="mr-2 h-4 w-4" />
                                    {tool.charAt(0).toUpperCase() + tool.slice(1)} Tool
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => { setTool("select"); }}>
                                    <MousePointer className="mr-2 h-4 w-4" /> Select & Move
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => { setTool("place"); }}>
                                     <Circle className="mr-2 h-4 w-4" /> Add Place
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => { setTool("transition"); }}>
                                    <RectangleHorizontal className="mr-2 h-4 w-4" /> Add Transition
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => { setTool("arc"); setArcStartState(null); }}>
                                    <ArrowRight className="mr-2 h-4 w-4" /> Connect (Arc)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex items-center gap-2">
                            <Button onClick={() => setIsSimulating(true)} disabled={isSimulating} className="flex-1">
                                <Play className="mr-2 h-4 w-4" /> Start
                            </Button>
                            <Button onClick={() => setIsSimulating(false)} disabled={!isSimulating} variant="secondary" className="flex-1">
                                <Pause className="mr-2 h-4 w-4" /> Stop
                            </Button>
                             <Button onClick={resetDiagram} variant="outline" size="icon">
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                         {isSimulating && <div className="flex items-center justify-center gap-2 text-sm text-primary animate-pulse"><div className="w-2 h-2 rounded-full bg-primary" />Simulating...</div>}
                    </div>
                </SidebarGroup>

                <Separator />
                
                <SidebarGroup>
                    <SidebarGroupLabel className="flex items-center"><FileText className="mr-2"/>Properties</SidebarGroupLabel>
                    <div className="p-2 space-y-4">
                        {selectedElement ? (
                            <>
                                <PropertyDisplay label="Name" value={selectedElement.name} icon={<FileText size={16} />} />
                                <PropertyDisplay label="Type" value={selectedElement.type} icon={<Type size={16} />} />
                                {selectedElement.type === 'place' && (
                                    <>
                                        <Separator />
                                        <PropertyDisplay label="Tokens" value={selectedElement.tokens} icon={<Hash size={16} />} />
                                        <div className="flex items-center justify-between pt-2">
                                            <Button size="icon" variant="outline" onClick={() => changeTokens(-1)}><Minus className="h-4 w-4" /></Button>
                                            <span className="text-lg font-bold">{selectedElement.tokens}</span>
                                            <Button size="icon" variant="outline" onClick={() => changeTokens(1)}><Plus className="h-4 w-4" /></Button>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Select an element to see its properties.</p>
                        )}
                    </div>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <Button onClick={clearAll} variant="destructive" size="sm" className="w-full"><Trash2 className="mr-2 h-4 w-4" /> Clear Canvas</Button>
            </SidebarFooter>
        </Sidebar>

        <SidebarInset>
        <main className="flex-1 relative bg-slate-100 dark:bg-slate-900/50">
           <div className="absolute top-2 left-2 z-10">
                <SidebarTrigger />
            </div>
          <svg
            ref={svgRef}
            className="w-full h-full cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" className="fill-current text-muted-foreground" />
              </marker>
            </defs>

            {Array.from(arcs.values()).map((arc) => {
              const source = getElement(arc.sourceId);
              const dest = getElement(arc.destinationId);
              if (!source || !dest) return null;
              
              const dx = dest.position.x - source.position.x;
              const dy = dest.position.y - source.position.y;
              const angle = Math.atan2(dy, dx);
              
              const sourceRadius = source.type === 'place' ? PLACE_RADIUS : Math.max(TRANSITION_WIDTH / 2, TRANSITION_HEIGHT / 2);
              const destRadius = dest.type === 'place' ? PLACE_RADIUS : Math.max(TRANSITION_WIDTH / 2, TRANSITION_HEIGHT / 2);
              
              let startX = source.position.x;
              let startY = source.position.y;
              let endX = dest.position.x;
              let endY = dest.position.y;

              if (source.type === 'place') {
                 startX += sourceRadius * Math.cos(angle);
                 startY += sourceRadius * Math.sin(angle);
              } else {
                 const xBound = TRANSITION_WIDTH / 2;
                 const yBound = TRANSITION_HEIGHT / 2;
                 const tanAngle = Math.tan(angle);
                 const xIntersect = Math.abs(yBound / tanAngle);
                 const yIntersect = Math.abs(xBound * tanAngle);
                 if (xIntersect < xBound) {
                    startX += xIntersect * Math.sign(dx);
                    startY += yBound * Math.sign(dy);
                 } else {
                    startX += xBound * Math.sign(dx);
                    startY += yIntersect * Math.sign(dy);
                 }
              }

              if (dest.type === 'place') {
                  endX -= destRadius * Math.cos(angle);
                  endY -= destRadius * Math.sin(angle);
              } else {
                 const xBound = TRANSITION_WIDTH / 2;
                 const yBound = TRANSITION_HEIGHT / 2;
                 const tanAngle = Math.tan(angle);
                 const xIntersect = Math.abs(yBound / tanAngle);
                 const yIntersect = Math.abs(xBound * tanAngle);
                 if (xIntersect < xBound) {
                    endX -= xIntersect * Math.sign(dx);
                    endY -= yBound * Math.sign(dy);
                 } else {
                    endX -= xBound * Math.sign(dx);
                    endY -= yIntersect * Math.sign(dy);
                 }
              }


              return (
                <line
                  key={arc.id}
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  className="stroke-muted-foreground stroke-2"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            
            {arcStartState && (
                <line
                    x1={arcStartState.pos.x}
                    y1={arcStartState.pos.y}
                    x2={mousePosition.x}
                    y2={mousePosition.y}
                    className="stroke-primary stroke-2 stroke-dashed"
                    markerEnd="url(#arrowhead)"
                />
            )}

            {Array.from(elements.values()).map((el) => (
              <g
                key={el.id}
                transform={`translate(${el.position.x}, ${el.position.y})`}
                onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                onDoubleClick={() => handleDoubleClick(el.id)}
                className="cursor-pointer group/element"
              >
                {el.type === "place" ? (
                  <>
                    <circle
                      r={PLACE_RADIUS}
                      className={cn("stroke-2 transition-all", selectedElementId === el.id ? "stroke-primary fill-primary/10" : "stroke-foreground/80 fill-background group-hover/element:stroke-primary")}
                    />
                    <text
                      textAnchor="middle"
                      dy="5"
                      className="fill-current font-semibold select-none pointer-events-none"
                    >
                      {el.tokens > 0 && el.tokens}
                    </text>
                  </>
                ) : (
                  <rect
                    x={-TRANSITION_WIDTH / 2}
                    y={-TRANSITION_HEIGHT / 2}
                    width={TRANSITION_WIDTH}
                    height={TRANSITION_HEIGHT}
                    className={cn("stroke-2 transition-all", 
                        selectedElementId === el.id ? "stroke-primary" : "stroke-foreground/80 group-hover/element:stroke-primary",
                        el.isFirable ? "fill-accent/80 hover:fill-accent" : "fill-background"
                    )}
                    onClick={(e) => { e.stopPropagation(); fireTransition(el.id); }}
                  />
                )}
                <text
                  textAnchor="middle"
                  y={el.type === 'place' ? PLACE_RADIUS + 15 : TRANSITION_HEIGHT / 2 + 15}
                  className="fill-current select-none text-sm pointer-events-none"
                >
                  {editingElementId !== el.id && el.name}
                </text>
              </g>
            ))}
          </svg>
          {editingElementId && getElement(editingElementId) && (
              <input
                ref={inputRef}
                type="text"
                value={editingValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                className="absolute text-center bg-background border border-primary rounded-md px-1"
                style={{
                  left: getElement(editingElementId)!.position.x,
                  top: getElement(editingElementId)!.position.y + (getElement(editingElementId)!.type === 'place' ? PLACE_RADIUS + 5 : TRANSITION_HEIGHT / 2 + 5),
                  width: 80,
                  transform: 'translateX(-50%)',
                }}
              />
            )}
        </main>
        </SidebarInset>
    </div>
    </SidebarProvider>
  );
}
