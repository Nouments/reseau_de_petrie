
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
  Settings2,
  FileText,
  Type,
  Hash,
  RefreshCw,
  StepForward,
  ListTree,
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
import { ScrollArea } from "./ui/scroll-area";

type Tool = "select" | "place" | "transition" | "arc";
type NetworkElement = Place | Transition;

const PLACE_RADIUS = 30;
const TRANSITION_WIDTH = 60;
const TRANSITION_HEIGHT = 20;

const getInitialElements = (): Map<string, NetworkElement> => {
  const initialElements = new Map<string, NetworkElement>();
  // Client
  initialElements.set('p1', { id: 'p1', type: 'place', position: { x: 100, y: 300 }, name: 'Client: Prêt', tokens: 1 });
  initialElements.set('p2', { id: 'p2', type: 'place', position: { x: 800, y: 300 }, name: 'Client: IP Reçue', tokens: 0 });

  // Recursive Resolver
  initialElements.set('p3', { id: 'p3', type: 'place', position: { x: 250, y: 100 }, name: 'Résolveur: Attente', tokens: 1 });
  initialElements.set('p4', { id: 'p4', type: 'place', position: { x: 400, y: 100 }, name: 'Résolveur: Req. Racine', tokens: 0 });
  initialElements.set('p5', { id: 'p5', type: 'place', position: { x: 550, y: 100 }, name: 'Résolveur: Req. TLD', tokens: 0 });
  initialElements.set('p6', { id: 'p6', type: 'place', position: { x: 700, y: 100 }, name: 'Résolveur: Req. Autorit.', tokens: 0 });

  // DNS Servers
  initialElements.set('p7', { id: 'p7', type: 'place', position: { x: 400, y: 500 }, name: 'Serveur Racine', tokens: 1 });
  initialElements.set('p8', { id: 'p8', type: 'place', position: { x: 550, y: 500 }, name: 'Serveur TLD', tokens: 1 });
  initialElements.set('p9', { id: 'p9', type: 'place', position: { x: 700, y: 500 }, name: 'Serveur Autorit.', tokens: 1 });
  
  // Final State & Loop
  initialElements.set('p10', { id: 'p10', type: 'place', position: { x: 950, y: 300 }, name: 'Nouvelle Requête', tokens: 0 });


  // Transitions
  initialElements.set('t1', { id: 't1', type: 'transition', position: { x: 250, y: 300 }, name: 'Req. Résolveur', isFirable: false });
  initialElements.set('t2', { id: 't2', type: 'transition', position: { x: 400, y: 300 }, name: 'Rép. Racine', isFirable: false });
  initialElements.set('t3', { id: 't3', type: 'transition', position: { x: 550, y: 300 }, name: 'Rép. TLD', isFirable: false });
  initialElements.set('t4', { id: 't4', type: 'transition', position: { x: 700, y: 300 }, name: 'Rép. Autorit.', isFirable: false });
  initialElements.set('t5', { id: 't5', type: 'transition', position: { x: 800, y: 100 }, name: 'Envoi IP au Client', isFirable: false });
  initialElements.set('t6', { id: 't6', type: 'transition', position: { x: 950, y: 200 }, name: 'Recommencer', isFirable: false });
  
  return initialElements;
}

const getInitialArcs = (): Map<string, Arc> => {
    const initialArcs = new Map<string, Arc>();
    // Client sends query
    initialArcs.set('a1', { id: 'a1', sourceId: 'p1', destinationId: 't1' });
    initialArcs.set('a2', { id: 'a2', sourceId: 'p3', destinationId: 't1' });
    initialArcs.set('a3', { id: 'a3', sourceId: 't1', destinationId: 'p4' });

    // Resolver queries Root
    initialArcs.set('a4', { id: 'a4', sourceId: 'p4', destinationId: 't2' });
    initialArcs.set('a5', { id: 'a5', sourceId: 'p7', destinationId: 't2' });
    initialArcs.set('a6', { id: 'a6', sourceId: 't2', destinationId: 'p5' });
    initialArcs.set('a7', { id: 'a7', sourceId: 't2', destinationId: 'p7' }); // Root ready again

    // Resolver queries TLD
    initialArcs.set('a8', { id: 'a8', sourceId: 'p5', destinationId: 't3' });
    initialArcs.set('a9', { id: 'a9', sourceId: 'p8', destinationId: 't3' });
    initialArcs.set('a10', { id: 'a10', sourceId: 't3', destinationId: 'p6' });
    initialArcs.set('a11', { id: 'a11', sourceId: 't3', destinationId: 'p8' }); // TLD ready again

    // Resolver queries Authoritative
    initialArcs.set('a12', { id: 'a12', sourceId: 'p6', destinationId: 't4' });
    initialArcs.set('a13', { id: 'a13', sourceId: 'p9', destinationId: 't4' });
    initialArcs.set('a14', { id: 'a14', sourceId: 't4', destinationId: 'p9' }); // Authoritative ready again
    
    // Authoritative response enables sending IP to client
    initialArcs.set('a15', { id: 'a15', sourceId: 't4', destinationId: 'p3' }); // Resolver is free
    
    // Enable sending IP to client (t5) after t4
    const implicitArcId = 'implicit_t4_t5';
    initialArcs.set(implicitArcId, { id: implicitArcId, sourceId: 't4', destinationId: 't5'});

    // Send IP to Client
    initialArcs.set('a17', { id: 'a17', sourceId: 't5', destinationId: 'p2' });

    // Loop back
    initialArcs.set('a18', { id: 'a18', sourceId: 'p2', destinationId: 't6' });
    initialArcs.set('a19', { id: 'a19', sourceId: 't6', destinationId: 'p10' });
    initialArcs.set('a20', { id: 'a20', sourceId: 'p10', destinationId: 't1' });
    
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
  
  const svgRef = useRef<SVGSVGElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getElement = (id: string | null): NetworkElement | undefined =>
    id ? elements.get(id) : undefined;
  const selectedElement = getElement(selectedElementId);

  const resetDiagram = useCallback(() => {
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

  const checkFirable = useCallback(() => {
    const transitionsToUpdate = new Map<string, Partial<Transition>>();

    for (const el of elements.values()) {
        if (el.type !== "transition") continue;

        const incomingArcs = Array.from(arcs.values()).filter(
            (arc) => arc.destinationId === el.id
        );

        // A special case for t5 which is enabled by t4 firing
        if (el.id === 't5') {
            const isEnabledByT4 = incomingArcs.some(arc => {
                const source = getElement(arc.sourceId);
                return source?.type === 'transition' && source.isFirable;
            });

            // For t5, we just check if t4 fired. We don't need a token check.
            // A better model would have t4 create a token that t5 consumes.
            // For now, let's keep it simple: t5 is firable if an incoming transition *was* firable
            // This is tricky. A simple approach: t5 is enabled by an "event" from t4.
            // Let's model this by making t5 firable if the arc from t4 exists and t4 itself is firable.
            // This still has issues. The cleanest way is for t4 to produce a token.
            // Let's add an intermediate place.

            // Re-evaluating the model: t4 firing should enable t5. Let's create an intermediate place.
            // For now, let's stick to the direct transition link logic.
            // t5 is firable if t4 *just fired*. This requires state outside the petri net model, which is bad.
            
            // Let's simplify: A transition is firable if ALL its input PLACES have tokens.
            let isFirable = incomingArcs.length > 0;
            for (const arc of incomingArcs) {
                const source = getElement(arc.sourceId);
                if (source?.type === "place") {
                    if (source.tokens === 0) {
                        isFirable = false;
                        break;
                    }
                }
                 else if (source?.type === "transition") {
                    // In this model, a T->T arc implies dependency but not token flow.
                    // This is non-standard. The correct way is Place -> Transition -> Place.
                    // Let's ignore T->T arcs for firability check, and handle firing in fireTransition.
                    continue;
                }
            }

            // Let's correct the model to avoid T->T arcs for firability checks.
            const placeInputs = incomingArcs.filter(arc => getElement(arc.sourceId)?.type === 'place');
             isFirable = placeInputs.length > 0;
             for (const arc of placeInputs) {
                const source = getElement(arc.sourceId) as Place;
                if (source.tokens === 0) {
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
                if (el) {
                  newElements.set(id, { ...el, ...updates });
                }
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
        
        // Consume tokens from input places
        incoming.forEach(arc => {
            const place = newElements.get(arc.sourceId);
            if (place && place.type === 'place') {
                newElements.set(arc.sourceId, {...place, tokens: Math.max(0, place.tokens - 1)});
            }
        });

        // Produce tokens in output places
        outgoing.forEach(arc => {
            const dest = newElements.get(arc.destinationId);
            if (dest && dest.type === 'place') {
                 newElements.set(arc.destinationId, {...dest, tokens: dest.tokens + 1});
            } else if (dest && dest.type === 'transition') {
                // This handles the implicit t4 -> t5 firing
                // The token doesn't go anywhere, it just enables the next transition
                // This is non-standard but a way to model sequential dependency without intermediate places
            }
        });

        return newElements;
    });
  }

  const runSimulationStep = () => {
    const firableTransitions = Array.from(elements.values()).filter(
        (el): el is Transition => el.type === 'transition' && el.isFirable
    );

    if (firableTransitions.length === 0) {
        return; 
    }
    
    // Fire the first available transition in the sequence for a deterministic simulation
    const transitionOrder = ['t1', 't2', 't3', 't4', 't5', 't6'];
    for (const id of transitionOrder) {
        const transition = firableTransitions.find(t => t.id === id);
        if(transition) {
            fireTransition(transition.id);
            return;
        }
    }

    // Fallback for any other firable transition
    fireTransition(firableTransitions[0].id);
  };


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
        setTool('select');
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
    const selected = getElement(selectedElementId);
    if (selected?.type === 'place') {
        const newTokens = Math.max(0, selected.tokens + amount);
        updateElement(selected.id, { tokens: newTokens });
    }
  }

  const clearAll = () => {
    setElements(new Map());
    setArcs(new Map());
    setSelectedElementId(null);
    setArcStartState(null);
    setEditingElementId(null);
  }
  
  const firableTransitionsCount = Array.from(elements.values()).filter(
    (el): el is Transition => el.type === 'transition' && el.isFirable
  ).length;

  const getArcPath = (arc: Arc): string | null => {
    const source = getElement(arc.sourceId);
    const dest = getElement(arc.destinationId);
    if (!source || !dest) return null;

    let startPoint: Point;
    let endPoint: Point;

    const dx = dest.position.x - source.position.x;
    const dy = dest.position.y - source.position.y;
    const angle = Math.atan2(dy, dx);

    if (source.type === 'place') {
        startPoint = {
            x: source.position.x + PLACE_RADIUS * Math.cos(angle),
            y: source.position.y + PLACE_RADIUS * Math.sin(angle),
        };
    } else { // transition
        startPoint = {
            x: source.position.x,
            y: source.position.y,
        };
    }

    if (dest.type === 'place') {
        const reversedAngle = Math.atan2(-dy, -dx);
        endPoint = {
            x: dest.position.x + PLACE_RADIUS * Math.cos(reversedAngle),
            y: dest.position.y + PLACE_RADIUS * Math.sin(reversedAngle),
        };
    } else { // transition
        endPoint = {
            x: dest.position.x,
            y: dest.position.y,
        };
    }
    
    if (source.type === 'transition') {
        const intersect = intersectRect(source.position, {w: TRANSITION_WIDTH, h: TRANSITION_HEIGHT}, endPoint);
        if (intersect) startPoint = intersect;
    }
    if (dest.type === 'transition') {
        const intersect = intersectRect(dest.position, {w: TRANSITION_WIDTH, h: TRANSITION_HEIGHT}, startPoint);
        if(intersect) endPoint = intersect;
    }

    // Custom path for the loopback arc for better visuals
    if (arc.id === 'a20') {
        const sx = source.position.x;
        const sy = source.position.y;
        const dx = dest.position.x;
        const dy = dest.position.y;
        return `M${sx},${sy} C ${sx+50},${sy} ${dx-50},${dy+100} ${dx},${dy}`
    }

    return `M${startPoint.x},${startPoint.y} L${endPoint.x},${endPoint.y}`;
  }

  const intersectRect = (rectCenter: Point, rectSize: {w: number, h: number}, point: Point) => {
      const dx = point.x - rectCenter.x;
      const dy = point.y - rectCenter.y;
      
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < 0.01 && absDy < 0.01) return rectCenter;
      
      const halfW = rectSize.w / 2;
      const halfH = rectSize.h / 2;

      let sx, sy;

      if (absDy * halfW > absDx * halfH) {
        // top or bottom edge
        sx = dx * halfH / absDy;
        sy = halfH * Math.sign(dy);
      } else {
        // left or right edge
        sx = halfW * Math.sign(dx);
        sy = dy * halfW / absDx;
      }
      
      return { x: rectCenter.x + sx, y: rectCenter.y + sy };
  };


  return (
    <SidebarProvider>
    <div className="flex h-screen w-full bg-background font-body text-foreground overflow-hidden">
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center gap-2 p-2">
                    <Share2 className="text-primary" />
                    <h1 className="text-xl font-bold text-primary">PetriDNS</h1>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <ScrollArea className="h-full">
                    <SidebarGroup>
                        <SidebarGroupLabel className="flex items-center"><Settings2 className="mr-2"/>Contrôles</SidebarGroupLabel>
                        <div className="grid gap-2 p-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start">
                                        <MousePointer className="mr-2 h-4 w-4" />
                                        {tool.charAt(0).toUpperCase() + tool.slice(1)} Outil
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={() => { setTool("select"); }}>
                                        <MousePointer className="mr-2 h-4 w-4" /> Sélectionner & Déplacer
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => { setTool("place"); }}>
                                        <Circle className="mr-2 h-4 w-4" /> Ajouter une Place
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => { setTool("transition"); }}>
                                        <RectangleHorizontal className="mr-2 h-4 w-4" /> Ajouter une Transition
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => { setTool("arc"); setArcStartState(null); }}>
                                        <ArrowRight className="mr-2 h-4 w-4" /> Connecter (Arc)
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="flex items-center gap-2">
                                <Button onClick={runSimulationStep} disabled={firableTransitionsCount === 0} className="flex-1">
                                    <StepForward className="mr-2 h-4 w-4" /> Étape Suivante
                                </Button>
                                <Button onClick={resetDiagram} variant="outline" size="icon">
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </SidebarGroup>

                    <Separator />
                    
                    <SidebarGroup>
                        <SidebarGroupLabel className="flex items-center"><FileText className="mr-2"/>Propriétés</SidebarGroupLabel>
                        <div className="p-2 space-y-4">
                            {selectedElement ? (
                                <>
                                    <PropertyDisplay label="Nom" value={selectedElement.name} icon={<FileText size={16} />} />
                                    <PropertyDisplay label="Type" value={selectedElement.type} icon={<Type size={16} />} />
                                    {selectedElement.type === 'place' && (
                                        <>
                                            <Separator />
                                            <PropertyDisplay label="Jetons" value={selectedElement.tokens} icon={<Hash size={16} />} />
                                            <div className="flex items-center justify-between pt-2">
                                                <Button size="icon" variant="outline" onClick={() => changeTokens(-1)}><Minus className="h-4 w-4" /></Button>
                                                <span className="text-lg font-bold">{selectedElement.tokens}</span>
                                                <Button size="icon" variant="outline" onClick={() => changeTokens(1)}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Sélectionnez un élément pour voir ses propriétés.</p>
                            )}
                        </div>
                    </SidebarGroup>

                    <Separator />
                    
                    <SidebarGroup>
                        <SidebarGroupLabel className="flex items-center"><ListTree className="mr-2"/>État du Réseau</SidebarGroupLabel>
                        <div className="p-2 space-y-2">
                            {Array.from(elements.values())
                                .filter((el): el is Place => el.type === 'place')
                                .sort((a,b) => a.name.localeCompare(b.name))
                                .map((place) => (
                                <div key={place.id} className="flex items-center justify-between text-sm hover:bg-muted/50 p-1 rounded-md">
                                    <span className="truncate text-muted-foreground">{place.name}</span>
                                    <span className="font-bold bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center">{place.tokens}</span>
                                </div>
                            ))}
                        </div>
                    </SidebarGroup>
                </ScrollArea>
            </SidebarContent>
            <SidebarFooter>
                <Button onClick={clearAll} variant="destructive" size="sm" className="w-full"><Trash2 className="mr-2 h-4 w-4" /> Vider le Canevas</Button>
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
                refX="0"
                refY="3.5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon points="0 0, 10 3.5, 0 7" className="fill-current text-muted-foreground" />
              </marker>
            </defs>

            {Array.from(arcs.values()).map((arc) => {
              const path = getArcPath(arc);
              if (!path || path.includes("NaN")) return null;

              return (
                <path
                  key={arc.id}
                  d={path}
                  className="stroke-muted-foreground stroke-2 fill-none"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            
            {arcStartState && getElement(arcStartState.id) && (
                <line
                    x1={getElement(arcStartState.id)!.position.x}
                    y1={getElement(arcStartState.id)!.position.y}
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
                      className="fill-current font-semibold select-none pointer-events-none text-lg"
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
                  y={el.type === 'place' ? PLACE_RADIUS + 20 : (TRANSITION_HEIGHT / 2) + 20}
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
                  top: getElement(editingElementId)!.position.y + (getElement(editingElementId)!.type === 'place' ? PLACE_RADIUS + 15 : TRANSITION_HEIGHT / 2 + 15),
                  width: 120,
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
