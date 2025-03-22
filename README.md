# Espruino with Typescript quickstart

## `make` scripts:

`build` - build file

`deploy` - upload build file to board

`watch` - build file and upload it to board with watch option

## Uploading to Espruino Board

You can use the provided upload script to compile and upload your code to an Espruino board:

```bash
# Install dependencies if not done already
yarn install

# Upload to Espruino board
yarn upload
```

To specify a particular serial port, use the `ESPRUINO_PORT` environment variable:

```bash
# For macOS/Linux
ESPRUINO_PORT=/dev/tty.usbmodem1234 yarn upload

# For Windows
set ESPRUINO_PORT=COM3 && yarn upload
```

The upload script performs the following steps:

1. Cleans previous build files
2. Compiles TypeScript code
3. Prepares the build for Espruino compatibility
4. Creates the final bundle
5. Uploads the bundle to the connected Espruino board

If you encounter connection issues, check that:

- The board is properly connected
- You have correct permissions to access the serial port
- The correct port is specified (if multiple devices are connected)

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
