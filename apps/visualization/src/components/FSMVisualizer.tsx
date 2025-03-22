import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactFlow, {
	ReactFlowProvider,
	Controls,
	Background,
	MiniMap,
	useNodesState,
	useEdgesState,
	Panel,
	EdgeProps,
	getBezierPath,
	EdgeLabelRenderer,
	Node,
	Edge,
	NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FiniteStateMachine } from '@tspruino/machine';
import { fsmToReactFlowElements } from '../utils/fsm-to-reactflow';
import { forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide } from 'd3-force';

// Custom edge component to better display conditions
const ConditionEdge = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	style = {},
	data,
	markerEnd,
	label,
}: EdgeProps) => {
	const [edgePath, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	});

	// Get event type from data
	const eventType = data?.eventType || '';

	return (
		<>
			<path
				id={id}
				style={style}
				className="react-flow__edge-path"
				d={edgePath}
				markerEnd={markerEnd}
			/>
			{(label || eventType) && (
				<EdgeLabelRenderer>
					<div
						style={{
							position: 'absolute',
							transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
							background: 'white',
							padding: '4px 8px',
							borderRadius: '4px',
							fontSize: 12,
							fontWeight: 500,
							border: '1px solid #e8e8e8',
							pointerEvents: 'all',
							minWidth: '40px',
							textAlign: 'center',
						}}
						className="nodrag nopan"
						title={`Event: ${eventType}`}
					>
						{label ? (
							<div
								style={{
									fontSize: 10,
									color: '#52c41a',
									fontStyle: 'italic',
								}}
							>
								{label}
							</div>
						) : (
							<div
								style={{
									fontSize: 9,
									color: '#999',
									fontStyle: 'italic',
									opacity: 0.7,
								}}
							>
								•
							</div>
						)}
					</div>
				</EdgeLabelRenderer>
			)}
		</>
	);
};

// Generalized event configuration interface
interface EventConfig {
	type: string;
	fields: EventField[];
	defaultPayload?: Record<string, any>;
}

interface EventField {
	name: string;
	label: string;
	type: 'number' | 'text' | 'boolean' | 'select';
	defaultValue?: any;
	options?: Array<{ value: any; label: string }>; // For select fields
	step?: number; // For number inputs
	transform?: (value: any) => any; // Optional transformation function
}

// Generic event payload structure
interface GenericPayload {
	[eventType: string]: Record<string, any>;
}

// Define types for our React Flow nodes and edges
interface FSMNodeData {
	label: string;
	isActive?: boolean;
	description?: string;
	[key: string]: any;
}

interface FSMEdgeData {
	eventType?: string;
	condition?: string;
	[key: string]: any;
}

type FSMNode = Node<FSMNodeData>;
type FSMEdge = Edge<FSMEdgeData>;

// Add function to apply D3-Force layout to existing nodes
const applyD3ForceLayout = (nodes: FSMNode[], edges: FSMEdge[]) => {
	// Extract node and edge data for D3
	const d3Nodes = nodes.map((n: FSMNode) => ({
		id: n.id,
		x: n.position.x,
		y: n.position.y,
		// Keep reference to original node
		originalNode: n,
	}));

	const d3Links = edges.map((e: FSMEdge) => ({
		source: e.source,
		target: e.target,
		value: 1,
	}));

	// Run the force simulation
	const simulation = forceSimulation(d3Nodes)
		.force('charge', forceManyBody().strength(-500))
		.force(
			'link',
			forceLink(d3Links)
				.id((d: any) => d.id)
				.distance(150),
		)
		.force('center', forceCenter(500, 300))
		.force('collision', forceCollide().radius(80))
		.stop();

	// Run the simulation synchronously
	const numIterations = 300;
	for (let i = 0; i < numIterations; i++) {
		simulation.tick();
	}

	// Update the original nodes with new positions
	return nodes.map((node: FSMNode) => {
		const d3Node = d3Nodes.find((n: any) => n.id === node.id);
		if (d3Node) {
			return {
				...node,
				position: {
					x: d3Node.x,
					y: d3Node.y,
				},
			};
		}
		return node;
	});
};

// Interface for the FSMVisualizer component props
interface FSMVisualizerProps {
	machine: ReturnType<typeof FiniteStateMachine.create>;
	// Add configurable options for events and payloads
	eventConfigs?: EventConfig[];
}

const FSMVisualizer: React.FC<FSMVisualizerProps> = ({ machine, eventConfigs = [] }) => {
	const [nodes, setNodes, onNodesChange] = useNodesState<FSMNodeData>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<FSMEdgeData>([]);
	const [currentState, setCurrentState] = useState<string>('');
	const [context, setContext] = useState<Record<string, any>>({});
	const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'transitions' | 'events'>('transitions');

	// Initialize event payloads from configs
	const [eventPayloads, setEventPayloads] = useState<GenericPayload>(() => {
		const initialPayloads: GenericPayload = {};

		eventConfigs.forEach((config: EventConfig) => {
			if (config.defaultPayload) {
				initialPayloads[config.type] = { ...config.defaultPayload };
			} else {
				// Generate default payload from fields
				const payload: Record<string, any> = {};
				config.fields.forEach((field: EventField) => {
					if (field.defaultValue !== undefined) {
						payload[field.name] = field.defaultValue;
					}
				});
				initialPayloads[config.type] = payload;
			}
		});

		return initialPayloads;
	});

	const [transactionHistory, setTransactionHistory] = useState<
		Array<{
			time: string;
			from: string;
			to: string;
			event: string;
		}>
	>([]);
	const [eventHistory, setEventHistory] = useState<
		Array<{
			time: string;
			event: string;
			payload: string;
		}>
	>([]);

	// Define custom edge types
	const edgeTypes = useMemo(
		() => ({
			condition: ConditionEdge,
		}),
		[],
	);

	// Function to apply D3-Force layout
	const applyForceLayout = useCallback(() => {
		setNodes(nodes => applyD3ForceLayout(nodes, edges));
	}, [edges, setNodes]);

	// Subscribe to state changes
	useEffect(() => {
		// Convert FSM to ReactFlow elements
		const { nodes: initialNodes, edges: initialEdges } = fsmToReactFlowElements(machine);

		// Get the initial state
		const fsm = machine as any;
		const initialStateName = fsm.currentState;
		setCurrentState(initialStateName);

		// Update nodes to highlight current state
		const updatedNodes = initialNodes.map(node => ({
			...node,
			style: {
				...node.style,
				background: node.id === initialStateName ? '#e6fffa' : '#fff',
				border: node.id === initialStateName ? '2px solid #13c2c2' : '1px solid #ddd',
			},
			data: {
				...node.data,
				isActive: node.id === initialStateName,
			},
		}));

		// Update edges to use the custom edge type
		const updatedEdges = initialEdges.map(edge => ({
			...edge,
			type: 'condition',
		}));

		setNodes(updatedNodes);
		setEdges(updatedEdges);
		setContext({ ...fsm.context });

		// Subscribe to state changes
		const stateChangeUnsubscribe = fsm.on('state.change', (event: any) => {
			const newState = event.currentState;
			const prevState = event.previousState;

			setCurrentState(newState);

			// Add to transaction history
			setTransactionHistory(prev => [
				{
					time: new Date().toLocaleTimeString(),
					from: prevState,
					to: newState,
					event: event.event.type,
				},
				...prev.slice(0, 9), // Keep only the last 10 transactions
			]);

			// Highlight the current state, always prioritize the active state
			setNodes(nodes =>
				nodes.map(node => ({
					...node,
					style: {
						...node.style,
						// Current state has highest priority for styling
						background: node.id === newState ? '#e6fffa' : '#fff',
						border: node.id === newState ? '2px solid #13c2c2' : '1px solid #ddd',
					},
					data: {
						...node.data,
						isActive: node.id === newState,
					},
				})),
			);
		});

		// Subscribe to context updates
		const contextSubscriptions: (() => void)[] = [];

		// Get all context keys from the initial context
		const contextKeys = Object.keys(fsm.context);

		// Subscribe to each context property change
		contextKeys.forEach(key => {
			const unsubscribe = fsm.on(`context.update.${key}`, (event: any) => {
				setContext(prevContext => ({
					...prevContext,
					[key]: event.value,
				}));
			});

			contextSubscriptions.push(unsubscribe);
		});

		return () => {
			stateChangeUnsubscribe();
			contextSubscriptions.forEach(unsubscribe => unsubscribe());
		};
	}, [machine, setNodes, setEdges]);

	// Handle input change for event payload
	const handlePayloadChange = (
		event: React.ChangeEvent<HTMLInputElement>,
		eventType: string,
		field: string,
	) => {
		let value =
			event.target.type === 'number'
				? parseFloat(event.target.value)
				: event.target.type === 'checkbox'
					? event.target.checked
					: event.target.value;

		// Find field definition to check for transforms
		const eventConfig = eventConfigs.find((config: EventConfig) => config.type === eventType);
		if (eventConfig) {
			const fieldConfig = eventConfig.fields.find((f: EventField) => f.name === field);
			if (fieldConfig?.transform) {
				value = fieldConfig.transform(value);
			}
		}

		setEventPayloads(prev => ({
			...prev,
			[eventType]: {
				...(prev[eventType] || {}),
				[field]: value,
			},
		}));
	};

	// Function to dispatch events to the state machine
	const sendEvent = (eventType: string) => {
		const fsm = machine as any;

		// Create event with appropriate payload based on event type
		let event: any = { type: eventType };

		// Add payload if available for this event type
		if (eventPayloads[eventType]) {
			event = {
				...event,
				...eventPayloads[eventType],
			};
		}

		// Record this event in the event history
		setEventHistory(prev => [
			{
				time: new Date().toLocaleTimeString(),
				event: eventType,
				payload: eventPayloads[eventType] ? JSON.stringify(eventPayloads[eventType]) : '-',
			},
			...prev.slice(0, 49), // Keep last 50 events
		]);

		// Send the event to the state machine
		fsm.send(event);

		// Reset selected event after sending
		setSelectedEvent(null);
	};

	// Check if an event needs configuration
	const eventNeedsConfig = (eventType: string): boolean => {
		return eventConfigs.some(config => config.type === eventType);
	};

	// Handle click on event button
	const handleEventButtonClick = (eventType: string) => {
		if (eventNeedsConfig(eventType)) {
			setSelectedEvent(eventType);
		} else {
			// If the event doesn't need configuration, trigger it immediately
			sendEvent(eventType);
		}
	};

	// Generate buttons for available transitions
	const renderEventButtons = () => {
		const fsm = machine as any;
		const availableEvents = Object.keys(fsm.config.states[fsm.currentState]?.transitions || {});

		return availableEvents.map(eventType => (
			<button
				key={eventType}
				onClick={() => handleEventButtonClick(eventType)}
				style={{
					margin: '5px',
					padding: '8px 12px',
					background: selectedEvent === eventType ? '#096dd9' : '#1890ff',
					color: 'white',
					border: 'none',
					borderRadius: '4px',
					cursor: 'pointer',
				}}
			>
				{eventType}
			</button>
		));
	};

	// Render form for the selected event
	const renderEventForm = () => {
		if (!selectedEvent) return null;

		const eventConfig = eventConfigs.find((config: EventConfig) => config.type === selectedEvent);
		if (!eventConfig) return null;

		const formStyle = {
			marginTop: '10px',
			padding: '10px',
			backgroundColor: '#f0f5ff',
			borderRadius: '4px',
		};

		const inputContainerStyle = {
			display: 'flex',
			alignItems: 'center',
			marginBottom: '10px',
		};

		const labelStyle = {
			width: '120px',
			fontSize: '14px',
		};

		const inputStyle = {
			flex: 1,
			padding: '4px 8px',
		};

		const buttonContainerStyle = {
			display: 'flex',
			justifyContent: 'space-between',
		};

		const cancelButtonStyle = {
			padding: '6px 12px',
			background: '#f5f5f5',
			border: '1px solid #d9d9d9',
			borderRadius: '4px',
			cursor: 'pointer',
		};

		const sendButtonStyle = {
			padding: '6px 12px',
			background: '#52c41a',
			color: 'white',
			border: 'none',
			borderRadius: '4px',
			cursor: 'pointer',
		};

		const renderButtons = () => (
			<div style={buttonContainerStyle}>
				<button onClick={() => setSelectedEvent(null)} style={cancelButtonStyle}>
					Cancel
				</button>
				<button onClick={() => sendEvent(selectedEvent)} style={sendButtonStyle}>
					Send Event
				</button>
			</div>
		);

		return (
			<div style={formStyle}>
				<h4 style={{ margin: '0 0 8px 0' }}>Configure {selectedEvent}</h4>

				{eventConfig.fields.map((field: EventField) => {
					// Ensure we have a payload object for this event
					const payload = eventPayloads[selectedEvent] || {};
					// Get current value with fallback to default
					const currentValue =
						payload[field.name] !== undefined ? payload[field.name] : field.defaultValue;

					return (
						<div key={field.name} style={inputContainerStyle}>
							<label style={labelStyle}>{field.label}:</label>
							{field.type === 'number' && (
								<input
									type="number"
									value={currentValue}
									step={field.step}
									onChange={e => handlePayloadChange(e, selectedEvent, field.name)}
									style={inputStyle}
								/>
							)}
							{field.type === 'text' && (
								<input
									type="text"
									value={currentValue}
									onChange={e => handlePayloadChange(e, selectedEvent, field.name)}
									style={inputStyle}
								/>
							)}
							{field.type === 'boolean' && (
								<input
									type="checkbox"
									checked={currentValue}
									onChange={e => handlePayloadChange(e, selectedEvent, field.name)}
									style={{ margin: '0 8px' }}
								/>
							)}
							{field.type === 'select' && field.options && (
								<select
									value={currentValue}
									onChange={e =>
										handlePayloadChange(
											e as unknown as React.ChangeEvent<HTMLInputElement>,
											selectedEvent,
											field.name,
										)
									}
									style={inputStyle}
								>
									{field.options.map((option: { value: any; label: string }) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							)}
						</div>
					);
				})}

				{renderButtons()}
			</div>
		);
	};

	// Render the context values
	const renderContextValues = () => {
		return (
			<div
				style={{
					marginTop: '20px',
					backgroundColor: '#f8f8f8',
					padding: '10px',
					borderRadius: '5px',
				}}
			>
				<h3 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>
					Context Values
				</h3>
				<table style={{ width: '100%', borderCollapse: 'collapse' }}>
					<thead>
						<tr>
							<th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ddd' }}>
								Property
							</th>
							<th style={{ textAlign: 'right', padding: '5px', borderBottom: '1px solid #ddd' }}>
								Value
							</th>
						</tr>
					</thead>
					<tbody>
						{Object.entries(context).map(([key, value]) => {
							// Special handling for nested PID object
							if (key === 'PID' && typeof value === 'object') {
								return Object.entries(value).map(([pidKey, pidValue]) => (
									<tr key={`PID.${pidKey}`} style={{ borderBottom: '1px solid #eee' }}>
										<td style={{ padding: '8px 5px', fontWeight: 500 }}>PID.{pidKey}</td>
										<td style={{ padding: '8px 5px', textAlign: 'right' }}>{String(pidValue)}</td>
									</tr>
								));
							}

							// Handle time values
							const displayValue =
								typeof value === 'number' &&
								(key.includes('Time') || key.includes('time')) &&
								value > 1600000000000 // Check if it's a timestamp (large number)
									? new Date(value).toLocaleString()
									: String(value);

							return (
								<tr key={key} style={{ borderBottom: '1px solid #eee' }}>
									<td style={{ padding: '8px 5px', fontWeight: 500 }}>{key}</td>
									<td style={{ padding: '8px 5px', textAlign: 'right' }}>{displayValue}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		);
	};

	// Render transaction history
	const renderTransactionHistory = () => {
		if (transactionHistory.length === 0 && eventHistory.length === 0) return null;

		return (
			<div
				style={{
					marginTop: '20px',
					backgroundColor: '#f8f8f8',
					padding: '10px',
					borderRadius: '5px',
				}}
			>
				<h3 style={{ margin: '0 0 10px 0', paddingBottom: '5px' }}>History</h3>
				<div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '10px' }}>
					<div
						onClick={() => setActiveTab('transitions')}
						style={{
							padding: '8px 15px',
							fontWeight: activeTab === 'transitions' ? 'bold' : 'normal',
							borderBottom: activeTab === 'transitions' ? '2px solid #13c2c2' : 'none',
							cursor: 'pointer',
						}}
					>
						Transitions
					</div>
					<div
						onClick={() => setActiveTab('events')}
						style={{
							padding: '8px 15px',
							fontWeight: activeTab === 'events' ? 'bold' : 'normal',
							borderBottom: activeTab === 'events' ? '2px solid #13c2c2' : 'none',
							cursor: 'pointer',
						}}
					>
						Events
					</div>
				</div>

				{activeTab === 'transitions' ? (
					<>
						<table style={{ width: '100%', borderCollapse: 'collapse' }}>
							<thead>
								<tr>
									<th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ddd' }}>
										Time
									</th>
									<th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ddd' }}>
										From
									</th>
									<th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ddd' }}>
										To
									</th>
									<th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ddd' }}>
										Event
									</th>
								</tr>
							</thead>
							<tbody>
								{transactionHistory.map((transaction, index) => (
									<tr key={index} style={{ borderBottom: '1px solid #eee' }}>
										<td style={{ padding: '6px 5px' }}>{transaction.time}</td>
										<td style={{ padding: '6px 5px' }}>{transaction.from}</td>
										<td style={{ padding: '6px 5px' }}>{transaction.to}</td>
										<td style={{ padding: '6px 5px' }}>{transaction.event}</td>
									</tr>
								))}
							</tbody>
						</table>
					</>
				) : (
					<>
						<table style={{ width: '100%', borderCollapse: 'collapse' }}>
							<thead>
								<tr>
									<th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ddd' }}>
										Time
									</th>
									<th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ddd' }}>
										Event
									</th>
									<th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ddd' }}>
										Payload
									</th>
								</tr>
							</thead>
							<tbody>
								{eventHistory.map((event, index) => (
									<tr key={index} style={{ borderBottom: '1px solid #eee' }}>
										<td style={{ padding: '6px 5px' }}>{event.time}</td>
										<td style={{ padding: '6px 5px' }}>{event.event}</td>
										<td style={{ padding: '6px 5px', maxWidth: '150px', overflowX: 'auto' }}>
											{event.payload}
										</td>
									</tr>
								))}
								{eventHistory.length === 0 && (
									<tr>
										<td colSpan={3} style={{ padding: '10px', textAlign: 'center' }}>
											No events triggered yet
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</>
				)}
			</div>
		);
	};

	return (
		<div style={{ width: '100%', height: '90%' }}>
			<ReactFlowProvider>
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					edgeTypes={edgeTypes}
					nodesDraggable={true}
					fitView
				>
					<Controls />
					<MiniMap />
					<Background />
					<Panel position="top-right">
						<button
							onClick={() => {
								// Re-fetch the FSM layout
								const { nodes: initialNodes, edges: initialEdges } =
									fsmToReactFlowElements(machine);

								// Apply the current state styling
								const updatedNodes = initialNodes.map(node => ({
									...node,
									style: {
										...node.style,
										background: node.id === currentState ? '#e6fffa' : '#fff',
										border: node.id === currentState ? '2px solid #13c2c2' : '1px solid #ddd',
									},
									data: {
										...node.data,
										isActive: node.id === currentState,
									},
								}));

								const updatedEdges = initialEdges.map(edge => ({
									...edge,
									type: 'condition',
								}));

								setNodes(updatedNodes);
								setEdges(updatedEdges);
							}}
							style={{
								padding: '8px 16px',
								background: '#f0f0f0',
								border: '1px solid #d9d9d9',
								borderRadius: '4px',
								cursor: 'pointer',
								boxShadow: '0 2px 0 rgba(0,0,0,0.02)',
								fontWeight: 500,
								marginBottom: '10px',
							}}
						>
							Reset Layout
						</button>
						<button
							onClick={applyForceLayout}
							style={{
								padding: '8px 16px',
								background: '#1890ff',
								color: 'white',
								border: '1px solid #1890ff',
								borderRadius: '4px',
								cursor: 'pointer',
								boxShadow: '0 2px 0 rgba(0,0,0,0.02)',
								fontWeight: 500,
							}}
						>
							Apply D3-Force Layout
						</button>
					</Panel>
					<Panel position="top-left">
						<div
							style={{
								background: 'white',
								padding: '10px',
								borderRadius: '5px',
								boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
								maxWidth: '380px',
								maxHeight: '80vh',
								overflowY: 'auto',
							}}
						>
							<h3 style={{ margin: '0 0 10px 0' }}>
								Current State: <span style={{ color: '#13c2c2' }}>{currentState}</span>
							</h3>
							<div>
								<h4 style={{ margin: '5px 0' }}>Available Events:</h4>
								{renderEventButtons()}
							</div>
							{selectedEvent && renderEventForm()}
							{renderContextValues()}
							{renderTransactionHistory()}
						</div>
					</Panel>
				</ReactFlow>
			</ReactFlowProvider>
		</div>
	);
};

export default FSMVisualizer;
