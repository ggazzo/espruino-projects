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

interface FSMVisualizerProps {
	machine: any; // Using any for flexibility with different machine types
}

// Event payload structure for different events
interface EventPayload {
	READ_TEMPERATURE: {
		temperature: number;
	};
	TEMPERATURE: {
		temperature: number;
	};
	HYSTERESIS_TEMP: {
		temperature: number;
	};
	VOLUME: {
		volume: number;
	};
	WAIT_TEMPERATURE: {
		temperature: number;
	};
	HYSTERESIS_TIME: {
		time: number;
	};
	PID: {
		kp: number;
		ki: number;
		kd: number;
		pOn: number;
	};
	WATTS: {
		watts: number;
	};
	PREPARE_ABSOLUTE_TIME: {
		preparing_time: number;
	};
	[key: string]: any;
}

// Events that require configuration
const EVENTS_WITH_PAYLOAD = [
	'READ_TEMPERATURE',
	'TEMPERATURE',
	'HYSTERESIS_TEMP',
	'VOLUME',
	'WAIT_TEMPERATURE',
	'HYSTERESIS_TIME',
	'PID',
	'WATTS',
	'PREPARE_ABSOLUTE_TIME',
];

// Add function to apply D3-Force layout to existing nodes
const applyD3ForceLayout = (nodes, edges) => {
	// Extract node and edge data for D3
	const d3Nodes = nodes.map(n => ({
		id: n.id,
		x: n.position.x,
		y: n.position.y,
		// Keep reference to original node
		originalNode: n,
	}));

	const d3Links = edges.map(e => ({
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
	return nodes.map(node => {
		const d3Node = d3Nodes.find(n => n.id === node.id);
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

const FSMVisualizer: React.FC<FSMVisualizerProps> = ({ machine }) => {
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);
	const [currentState, setCurrentState] = useState<string>('');
	const [context, setContext] = useState<Record<string, any>>({});
	const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'transitions' | 'events'>('transitions');
	const [eventPayloads, setEventPayloads] = useState<EventPayload>({
		READ_TEMPERATURE: { temperature: 25 },
		TEMPERATURE: { temperature: 80 },
		HYSTERESIS_TEMP: { temperature: 5 },
		VOLUME: { volume: 500 },
		WAIT_TEMPERATURE: { temperature: 65 },
		HYSTERESIS_TIME: { time: 10 },
		PID: { kp: 0.1, ki: 0.01, kd: 0.001, pOn: 0 },
		WATTS: { watts: 1500 },
		PREPARE_ABSOLUTE_TIME: { preparing_time: Date.now() + 60000 }, // 1 minute from now
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
		const value =
			event.target.type === 'number' ? parseFloat(event.target.value) : event.target.value;

		setEventPayloads(prev => ({
			...prev,
			[eventType]: {
				...prev[eventType],
				[field]: value,
			},
		}));
	};

	// Function to dispatch events to the state machine
	const sendEvent = (eventType: string) => {
		const fsm = machine as any;

		// Create event with appropriate payload based on event type
		let event: any = { type: eventType };

		if (EVENTS_WITH_PAYLOAD.includes(eventType) && eventPayloads[eventType]) {
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
				payload: EVENTS_WITH_PAYLOAD.includes(eventType)
					? JSON.stringify(eventPayloads[eventType])
					: '-',
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
		return EVENTS_WITH_PAYLOAD.includes(eventType);
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

	// Return input fields for the selected event
	const renderEventForm = () => {
		if (!selectedEvent) return null;

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

		switch (selectedEvent) {
			case 'READ_TEMPERATURE':
			case 'TEMPERATURE':
			case 'HYSTERESIS_TEMP':
			case 'WAIT_TEMPERATURE':
				return (
					<div style={formStyle}>
						<h4 style={{ margin: '0 0 8px 0' }}>Configure {selectedEvent}</h4>
						<div style={inputContainerStyle}>
							<label style={labelStyle}>Temperature (°C):</label>
							<input
								type="number"
								value={eventPayloads[selectedEvent].temperature}
								onChange={e => handlePayloadChange(e, selectedEvent, 'temperature')}
								style={inputStyle}
							/>
						</div>
						{renderButtons()}
					</div>
				);
			case 'VOLUME':
				return (
					<div style={formStyle}>
						<h4 style={{ margin: '0 0 8px 0' }}>Configure {selectedEvent}</h4>
						<div style={inputContainerStyle}>
							<label style={labelStyle}>Volume (ml):</label>
							<input
								type="number"
								value={eventPayloads.VOLUME.volume}
								onChange={e => handlePayloadChange(e, 'VOLUME', 'volume')}
								style={inputStyle}
							/>
						</div>
						{renderButtons()}
					</div>
				);
			case 'HYSTERESIS_TIME':
				return (
					<div style={formStyle}>
						<h4 style={{ margin: '0 0 8px 0' }}>Configure {selectedEvent}</h4>
						<div style={inputContainerStyle}>
							<label style={labelStyle}>Time (seconds):</label>
							<input
								type="number"
								value={eventPayloads.HYSTERESIS_TIME.time}
								onChange={e => handlePayloadChange(e, 'HYSTERESIS_TIME', 'time')}
								style={inputStyle}
							/>
						</div>
						{renderButtons()}
					</div>
				);
			case 'PID':
				return (
					<div style={formStyle}>
						<h4 style={{ margin: '0 0 8px 0' }}>Configure {selectedEvent}</h4>
						<div style={inputContainerStyle}>
							<label style={labelStyle}>Kp:</label>
							<input
								type="number"
								step="0.001"
								value={eventPayloads.PID.kp}
								onChange={e => handlePayloadChange(e, 'PID', 'kp')}
								style={inputStyle}
							/>
						</div>
						<div style={inputContainerStyle}>
							<label style={labelStyle}>Ki:</label>
							<input
								type="number"
								step="0.001"
								value={eventPayloads.PID.ki}
								onChange={e => handlePayloadChange(e, 'PID', 'ki')}
								style={inputStyle}
							/>
						</div>
						<div style={inputContainerStyle}>
							<label style={labelStyle}>Kd:</label>
							<input
								type="number"
								step="0.001"
								value={eventPayloads.PID.kd}
								onChange={e => handlePayloadChange(e, 'PID', 'kd')}
								style={inputStyle}
							/>
						</div>
						<div style={inputContainerStyle}>
							<label style={labelStyle}>pOn:</label>
							<input
								type="number"
								value={eventPayloads.PID.pOn}
								onChange={e => handlePayloadChange(e, 'PID', 'pOn')}
								style={inputStyle}
							/>
						</div>
						{renderButtons()}
					</div>
				);
			case 'WATTS':
				return (
					<div style={formStyle}>
						<h4 style={{ margin: '0 0 8px 0' }}>Configure {selectedEvent}</h4>
						<div style={inputContainerStyle}>
							<label style={labelStyle}>Watts:</label>
							<input
								type="number"
								value={eventPayloads.WATTS.watts}
								onChange={e => handlePayloadChange(e, 'WATTS', 'watts')}
								style={inputStyle}
							/>
						</div>
						{renderButtons()}
					</div>
				);
			case 'PREPARE_ABSOLUTE_TIME':
				return (
					<div style={formStyle}>
						<h4 style={{ margin: '0 0 8px 0' }}>Configure {selectedEvent}</h4>
						<div style={inputContainerStyle}>
							<label style={labelStyle}>Seconds from now:</label>
							<input
								type="number"
								onChange={e => {
									// Calculate timestamp that is N seconds from now
									const secondsFromNow = parseInt(e.target.value) || 0;
									const timestamp = Date.now() + secondsFromNow * 1000;
									handlePayloadChange(
										{
											...e,
											target: { ...e.target, value: timestamp.toString(), type: 'number' },
										} as any,
										'PREPARE_ABSOLUTE_TIME',
										'preparing_time',
									);
								}}
								defaultValue="60"
								style={inputStyle}
							/>
						</div>
						<div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
							Will prepare for:{' '}
							{new Date(eventPayloads.PREPARE_ABSOLUTE_TIME.preparing_time).toLocaleTimeString()}
						</div>
						{renderButtons()}
					</div>
				);
			default:
				return null; // This should never be reached now since we only select events that need config
		}
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
