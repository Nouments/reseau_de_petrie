# **App Name**: PetriPainter

## Core Features:

- Canvas Display: Display an interactive canvas representing the Petri net, where places and transitions can be added.
- Shape Creation: Enable users to draw places (circles) and transitions (rectangles) on the canvas, and label each with names.
- Arc Drawing: Allow drawing connections (arrows) to represent the flow of tokens between places and transitions.
- Token Addition: Users can add tokens to places.  Each place will show how many tokens are within.
- Transition Firing Indicator: When a transition has enough tokens to fire, a visual tool will highlight that transition to indicate to the user it is available to fire.
- Manual Stepping: Provide controls to manually step through the execution of the Petri net, moving tokens from input places to output places when a transition fires.

## Style Guidelines:

- Primary color: Blue (#3498DB), evoking precision and digital design, reminiscent of electronic circuit boards and network diagrams.
- Background color: Light gray (#ECF0F1), offering a clean and unobtrusive backdrop that keeps the focus on the Petri Net elements.
- Accent color: Orange (#E67E22), employed to highlight interactive elements like active transitions, calling attention without overwhelming the visual space.
- Font: 'Inter', a grotesque-style sans-serif (sans-serif) for a modern, machined, objective, neutral look.
- Simple, geometric icons to represent tools and actions, in a style that complements the technical aesthetic of the Petri net diagrams.
- A clean, grid-based layout will organize the canvas and controls. Adequate spacing between elements will help avoid a cluttered UI.
- Subtle animations should mark the movement of tokens and the firing of transitions, using visual cues without being distracting, using Tailwind CSS.