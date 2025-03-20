# Espruino with Typescript quickstart

## `make` scripts:

`build` - build file

`deploy` - upload build file to board

`watch` - build file and upload it to board with watch option

# FSM Visualizer

This project provides a visual representation of Finite State Machines using React Flow.

## Features

- Interactive visualization of state machines
- Click buttons to transition between states
- Highlights the current state
- Shows available transitions

## Getting Started

1. Install dependencies:

   ```
   yarn install
   ```

2. Start the development server:

   ```
   yarn start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## How to Use

- The application visualizes the Finite State Machines defined in your code
- Click on the transition buttons to see how the state machine changes states
- The current state is highlighted in the diagram
- You can pan and zoom the diagram using mouse controls

## Project Structure

- `src/components/FSMVisualizer.tsx`: Main component for visualizing FSMs
- `src/utils/fsm-to-reactflow.ts`: Utility to convert FSM configuration to React Flow elements
- `src/machine.ts`: FSM implementation
- `src/heating.machine.ts`: Example heating state machine
