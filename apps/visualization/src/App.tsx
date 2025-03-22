import React from 'react';
import FSMVisualizer from './components/FSMVisualizer';
import { create as createMainMachine } from '@tspruino/application';

function App() {
	// Create the main machine instance
	const machine = createMainMachine();

	return (
		<div style={{ width: '100%', height: '100%' }}>
			<FSMVisualizer machine={machine as any} />
		</div>
	);
}

export default App;
