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

type Tool = "select" | "place" | "transition" | "arc";
type NetworkElement = Place | Transition;

const PLACE_RADIUS = 30;
const TRANSITION_WIDTH = 60;
const TRANSITION_HEIGHT = 20;

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

  const svgRef = useRef<SVGSVGElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getElement = (id: string | null) =>
    id ? elements.get(id) : undefined;
  const selectedElement = getElement(selectedElementId);

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
    setElements(new Map());
    setArcs(new Map());
    setSelectedElementId(null);
    setArcStartState(null);
    setEditingElementId(null);
  }

  return (
    <div className="flex flex-col h-screen w-full bg-background font-body text-foreground overflow-hidden">
      <header className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
            <Share2 className="text-primary" />
            <h1 className="text-xl font-bold text-primary">PetriPainter</h1>
        </div>
        <Button onClick={clearAll} variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Clear Canvas</Button>
      </header>
      <div className="flex flex-1">
        <aside className="w-64 p-4 border-r">
          <Card>
            <CardHeader>
              <CardTitle>Tools</CardTitle>
              <CardDescription>Select a tool to build your net.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button onClick={() => setTool("select")} variant={tool === "select" ? "secondary" : "ghost"} className="justify-start"> <MousePointer className="mr-2 h-4 w-4" /> Select & Move </Button>
              <Button onClick={() => setTool("place")} variant={tool === "place" ? "secondary" : "ghost"} className="justify-start"> <Circle className="mr-2 h-4 w-4" /> Add Place </Button>
              <Button onClick={() => setTool("transition")} variant={tool === "transition" ? "secondary" : "ghost"} className="justify-start"> <RectangleHorizontal className="mr-2 h-4 w-4" /> Add Transition </Button>
              <Button onClick={() => { setTool("arc"); setArcStartState(null); }} variant={tool === "arc" ? "secondary" : "ghost"} className="justify-start"> <ArrowRight className="mr-2 h-4 w-4" /> Connect (Arc) </Button>
            </CardContent>
          </Card>
          
          <Separator className="my-4" />
          
          {selectedElement?.type === 'place' && (
             <Card>
                <CardHeader>
                  <CardTitle>Tokens</CardTitle>
                  <CardDescription>Manage tokens for '{selectedElement.name}'.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <Button size="icon" variant="outline" onClick={() => changeTokens(-1)}><Minus className="h-4 w-4" /></Button>
                    <span className="text-2xl font-bold">{selectedElement.tokens}</span>
                    <Button size="icon" variant="outline" onClick={() => changeTokens(1)}><Plus className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
          )}

        </aside>
        <main className="flex-1 relative bg-slate-100 dark:bg-slate-900/50">
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

            {/* Arcs */}
            {Array.from(arcs.values()).map((arc) => {
              const source = getElement(arc.sourceId);
              const dest = getElement(arc.destinationId);
              if (!source || !dest) return null;
              
              const dx = dest.position.x - source.position.x;
              const dy = dest.position.y - source.position.y;
              const angle = Math.atan2(dy, dx);
              
              const sourceRadius = source.type === 'place' ? PLACE_RADIUS : TRANSITION_WIDTH / 2;
              const destRadius = dest.type === 'place' ? PLACE_RADIUS : TRANSITION_WIDTH / 2;
              
              const startX = source.position.x + sourceRadius * Math.cos(angle);
              const startY = source.position.y + sourceRadius * Math.sin(angle);
              const endX = dest.position.x - destRadius * Math.cos(angle);
              const endY = dest.position.y - destRadius * Math.sin(angle);

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
            
            {/* Preview Arc */}
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

            {/* Elements */}
            {Array.from(elements.values()).map((el) => (
              <g
                key={el.id}
                transform={`translate(${el.position.x}, ${el.position.y})`}
                onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                onDoubleClick={() => handleDoubleClick(el.id)}
                className="cursor-pointer"
              >
                {el.type === "place" ? (
                  <>
                    <circle
                      r={PLACE_RADIUS}
                      className={cn("stroke-2 transition-all", selectedElementId === el.id ? "stroke-primary fill-primary/10" : "stroke-foreground/80 fill-background")}
                    />
                    <text
                      textAnchor="middle"
                      dy="5"
                      className="fill-current font-semibold select-none"
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
                        selectedElementId === el.id ? "stroke-primary" : "stroke-foreground/80",
                        el.isFirable ? "fill-accent/80 hover:fill-accent" : "fill-background"
                    )}
                    onClick={() => fireTransition(el.id)}
                  />
                )}
                <text
                  textAnchor="middle"
                  y={el.type === 'place' ? PLACE_RADIUS + 15 : TRANSITION_HEIGHT / 2 + 15}
                  className="fill-current select-none text-sm"
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
                  left: getElement(editingElementId)!.position.x - 40,
                  top: getElement(editingElementId)!.position.y + (getElement(editingElementId)!.type === 'place' ? PLACE_RADIUS + 5 : TRANSITION_HEIGHT / 2 + 5),
                  width: 80,
                }}
              />
            )}
        </main>
      </div>
    </div>
  );
}
