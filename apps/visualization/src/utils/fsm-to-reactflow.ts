import { Node, Edge, Position } from 'reactflow';
import { FiniteStateMachine } from '@tspruino/machine';
import { forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide } from 'd3-force';

interface StatePosition {
	[key: string]: { x: number; y: number };
}

interface StateConnection {
	source: string;
	target: string;
}

// D3-Force layout algorithm for better node distribution
const generateStatePositions = (
	stateNames: string[],
	connections: StateConnection[],
): StatePosition => {
	const positions: StatePosition = {};
	const width = 1000;
	const height = 600;

	// Create nodes for d3-force
	const nodes = stateNames.map(name => ({
		id: name,
		x: Math.random() * width,
		y: Math.random() * height,
	}));

	// Create links for d3-force
	const links = connections.map(conn => ({
		source: conn.source,
		target: conn.target,
		value: 1,
	}));

	// Create the force simulation
	const simulation = forceSimulation(nodes)
		.force('charge', forceManyBody().strength(-500)) // Repulsion between nodes
		.force(
			'link',
			forceLink(links)
				.id((d: any) => d.id)
				.distance(150),
		) // Links with set distance
		.force('center', forceCenter(width / 2, height / 2)) // Center the graph in the viewport
		.force('collision', forceCollide().radius(80)) // Prevent nodes from overlapping
		.stop(); // Don't run the simulation automatically

	// Run the simulation synchronously
	const numIterations = 300;
	for (let i = 0; i < numIterations; i++) {
		simulation.tick();
	}

	// Transfer the node positions to our state positions object
	nodes.forEach(node => {
		positions[node.id] = {
			x: node.x,
			y: node.y,
		};
	});

	return positions;
};

// Helper to extract a readable condition name from a function
const getConditionName = (condFunc: Function): string => {
	if (!condFunc) return '';

	// Convert the function to string and extract the relevant parts
	const funcStr = condFunc.toString();

	// Look for common patterns in condition functions
	if (funcStr.includes('return ')) {
		// Try to extract the return statement
		const returnMatch = funcStr.match(/return\s+([^;]+);/);
		if (returnMatch && returnMatch[1]) {
			return `[${returnMatch[1].trim()}]`;
		}
	}

	// If we can't extract a clean condition, return a simple indicator
	return '[condition]';
};

export const fsmToReactFlowElements = (
	fsm: ReturnType<typeof FiniteStateMachine.create>,
): { nodes: Node[]; edges: Edge[] } => {
	const config = (fsm as any).config;
	const stateNames = Object.keys(config.states);

	// Extract all state connections for the force-directed layout
	const connections: StateConnection[] = [];
	stateNames.forEach(sourceName => {
		const stateConfig = config.states[sourceName];
		const transitions = stateConfig.transitions;

		Object.entries(transitions).forEach(([eventType, transition]) => {
			const transitionList = Array.isArray(transition) ? transition : [transition];

			transitionList.forEach(trans => {
				if (trans && trans.target) {
					connections.push({
						source: sourceName,
						target: trans.target,
					});
				}
			});
		});
	});

	const statePositions = generateStatePositions(stateNames, connections);

	// Create nodes for each state
	const nodes: Node[] = stateNames.map(stateName => {
		const isInitial = config.initial === stateName;

		return {
			id: stateName,
			data: {
				label: stateName,
				isInitial,
			},
			position: statePositions[stateName],
			style: {
				background: isInitial ? '#e6f7ff' : '#fff',
				border: isInitial ? '2px solid #1890ff' : '1px solid #ddd',
				borderRadius: '8px',
				padding: '10px',
				width: 150,
				textAlign: 'center',
			},
		};
	});

	// Create edges for transitions
	const edges: Edge[] = [];

	stateNames.forEach(sourceName => {
		const stateConfig = config.states[sourceName];
		const transitions = stateConfig.transitions;

		Object.entries(transitions).forEach(([eventType, transition]) => {
			// Handle both single transition and array of transitions
			const transitionList = Array.isArray(transition) ? transition : [transition];

			transitionList.forEach((trans, index) => {
				if (!trans) return;

				const targetName = trans.target;
				const sourcePos = statePositions[sourceName];
				const targetPos = statePositions[targetName];

				// Calculate edge direction for self-loops
				const isSelfLoop = sourceName === targetName;

				// Create a label that only includes the condition if present
				let label = '';
				if (trans.cond) {
					label = getConditionName(trans.cond);
				}

				// For arrays of transitions with the same event type, add an index
				if (transitionList.length > 1) {
					label = label ? `${label} [${index + 1}]` : `[${index + 1}]`;
				}

				const edge: Edge = {
					id: `${sourceName}-${eventType}-${targetName}-${index}`,
					source: sourceName,
					target: targetName,
					label: label,
					data: {
						eventType: eventType, // Store event type in data for tooltip or other uses
					},
					labelStyle: { fill: '#666', fontSize: 12 },
					style: { stroke: '#999' },
					type: 'smoothstep',
					sourceHandle: isSelfLoop ? 'right' : undefined,
					targetHandle: isSelfLoop ? 'left' : undefined,
				};

				edges.push(edge);
			});
		});
	});

	return { nodes, edges };
};
