import React, { useCallback, useMemo, useState, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './FlowchartCanvas.css';

import ConditionNode from './ConditionNode';
import ValidatorPopup from './ValidatorPopup';

// This component now receives all its data and handlers as props.
// It no longer manages its own state, which resolves the infinite loop.
const FlowchartCanvas = ({ 
    logChange, 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    setNodes, 
    setEdges 
}) => {
    // Custom node types are still defined here
    const nodeTypes = useMemo(() => ({ condition: ConditionNode }), []);
    
    // Context menu state
    const [contextMenu, setContextMenu] = useState(null);
    const contextMenuRef = useRef(null);

    // The problematic useEffect hooks have been removed.

    const onConnect = useCallback(
        (params) => {
            // Use the setEdges function passed down as a prop
            setEdges((eds) => addEdge(params, eds));
            const sourceNode = nodes.find(n => n.id === params.source)?.data?.label || params.source;
            const targetNode = nodes.find(n => n.id === params.target)?.data?.label || params.target;
            logChange(
                'MANUAL', 
                'CONNECT_NODES', 
                `graph TD;\n  ${params.source}["${sourceNode}"] --> ${params.target}["${targetNode}"];`
            );
        },
        [setEdges, logChange, nodes]
    );

    // Log node deletions
    const handleNodesDelete = useCallback((deletedNodes) => {
        const details = deletedNodes.map(node => `Deleted node: "${node.data.label}" (ID: ${node.id})`).join('\n');
        logChange('MANUAL', 'DELETE_NODE', details);
    }, [logChange]);

    // Log edge deletions
    const handleEdgesDelete = useCallback((deletedEdges) => {
         const details = deletedEdges.map(edge => `Deleted connection from ${edge.source} to ${edge.target}`).join('\n');
        logChange('MANUAL', 'DELETE_EDGE', details);
    }, [logChange]);

    // Log text changes on nodes
    const handleNodeLabelChange = useCallback((event, node) => {
        const newLabel = event.target.value;
        const oldLabel = node.data.label;

        if (oldLabel === newLabel) return; // No change

        // Use the setNodes function passed down as a prop
        setNodes((nds) =>
            nds.map((n) => {
                if (n.id === node.id) {
                    return { ...n, data: { ...n.data, label: newLabel } };
                }
                return n;
            })
        );
        logChange('MANUAL', 'UPDATE_TEXT', `Changed text on node ${node.id} from "${oldLabel}" to "${newLabel}".`);
    }, [setNodes, logChange]);

    // Add a double-click handler to nodes for inline editing
    const onNodeDoubleClick = useCallback((event, node) => {
        // Remove any existing input elements first
        const existingInputs = document.querySelectorAll('.node-edit-input');
        existingInputs.forEach(input => {
            if (document.body.contains(input)) {
                document.body.removeChild(input);
            }
        });

        // Create an input element for inline editing
        const input = document.createElement('input');
        input.type = 'text';
        input.value = node.data.label;
        input.className = 'node-edit-input';
        input.style.cssText = `
            position: fixed;
            background: #1a1a1a;
            color: #ffffff;
            border: 2px solid #8b5cf6;
            border-radius: 4px;
            padding: 12px;
            font-size: 16px;
            z-index: 9999;
            min-width: 250px;
            font-family: inherit;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        `;
        
        // Position the input at the node's position
        const nodeElement = document.querySelector(`[data-id="${node.id}"]`);
        if (nodeElement) {
            const rect = nodeElement.getBoundingClientRect();
            input.style.left = `${rect.left}px`;
            input.style.top = `${rect.top}px`;
        }
        
        document.body.appendChild(input);
        input.focus();
        input.select();
        
        let isFinished = false;
        
        const finishEditing = () => {
            if (isFinished) return;
            isFinished = true;
            
            const newLabel = input.value.trim();
            if (newLabel && newLabel !== node.data.label) {
                handleNodeLabelChange({ target: { value: newLabel } }, node);
            }
            
            // Use setTimeout to ensure DOM is stable
            setTimeout(() => {
                if (document.body.contains(input)) {
                    document.body.removeChild(input);
                }
            }, 0);
        };
        
        const cancelEditing = () => {
            if (isFinished) return;
            isFinished = true;
            
            setTimeout(() => {
                if (document.body.contains(input)) {
                    document.body.removeChild(input);
                }
            }, 0);
        };
        
        input.addEventListener('blur', finishEditing, { once: true });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEditing();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEditing();
            }
        }, { once: true });
    }, [handleNodeLabelChange]);

    // Handle right-click context menu
    const onPaneContextMenu = useCallback((event) => {
        event.preventDefault();
        setContextMenu(null);
    }, []);

    const onNodeContextMenu = useCallback((event, node) => {
        event.preventDefault();
        event.stopPropagation();
        
        setContextMenu({
            id: node.id,
            top: event.clientY,
            left: event.clientX,
            type: 'node',
            node: node
        });
    }, []);

    const onEdgeContextMenu = useCallback((event, edge) => {
        event.preventDefault();
        event.stopPropagation();
        
        setContextMenu({
            id: edge.id,
            top: event.clientY,
            left: event.clientX,
            type: 'edge',
            edge: edge
        });
    }, []);

    // Delete node function
    const deleteNode = useCallback((nodeId) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setNodes(nds => nds.filter(n => n.id !== nodeId));
            setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
            logChange('MANUAL', 'DELETE_NODE', `Deleted node: "${node.data.label}" (ID: ${nodeId})`);
        }
        setContextMenu(null);
    }, [nodes, setNodes, setEdges, logChange]);

    // Delete edge function
    const deleteEdge = useCallback((edgeId) => {
        const edge = edges.find(e => e.id === edgeId);
        if (edge) {
            setEdges(eds => eds.filter(e => e.id !== edgeId));
            const sourceNode = nodes.find(n => n.id === edge.source)?.data?.label || edge.source;
            const targetNode = nodes.find(n => n.id === edge.target)?.data?.label || edge.target;
            logChange('MANUAL', 'DELETE_EDGE', `Deleted connection from "${sourceNode}" to "${targetNode}"`);
        }
        setContextMenu(null);
    }, [edges, setEdges, nodes, logChange]);

    // Close context menu when clicking elsewhere
    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    // Toolbar manual controls
    const addNode = (type) => {
        const newNode = {
            id: `node_${Date.now()}_${Math.random()}`,
            type,
            position: { x: 100, y: 100 },
            data: { label: type === 'condition' ? 'Condition?' : 'New Step' },
        };
        setNodes((nds) => nds.concat(newNode));
        logChange('MANUAL', 'ADD_NODE', `Added a new ${type} node.`);
    };

    return (
        <div className="flowchart-canvas">
            <div className="top-toolbar">
                <button className="btn btn-secondary" onClick={() => addNode('default')}>Add Step (Rectangle)</button>
                <button className="btn btn-secondary" onClick={() => addNode('condition')}>Add Condition (Diamond)</button>
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodesDelete={handleNodesDelete}
                onEdgesDelete={handleEdgesDelete}
                onNodeDoubleClick={onNodeDoubleClick}
                onPaneContextMenu={onPaneContextMenu}
                onNodeContextMenu={onNodeContextMenu}
                onEdgeContextMenu={onEdgeContextMenu}
                nodeTypes={nodeTypes}
                fitView
                onPaneClick={closeContextMenu}
            >
                <Controls position="bottom-left" style={{ bottom: 88, left: 16 }} />
                <Background />
            </ReactFlow>
            <ValidatorPopup nodes={nodes} edges={edges} />
            
            {/* Context Menu */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="context-menu"
                    style={{
                        position: 'fixed',
                        top: contextMenu.top,
                        left: contextMenu.left,
                        background: '#374151',
                        border: '1px solid #404040',
                        borderRadius: '8px',
                        padding: '8px 0',
                        zIndex: 1000,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                        minWidth: '150px'
                    }}
                >
                    {contextMenu.type === 'node' ? (
                        <button
                            className="context-menu-item"
                            onClick={() => deleteNode(contextMenu.id)}
                            style={{
                                width: '100%',
                                padding: '8px 16px',
                                background: 'transparent',
                                border: 'none',
                                color: '#ffffff',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#4b5563'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                            Delete Node
                        </button>
                    ) : (
                        <button
                            className="context-menu-item"
                            onClick={() => deleteEdge(contextMenu.id)}
                            style={{
                                width: '100%',
                                padding: '8px 16px',
                                background: 'transparent',
                                border: 'none',
                                color: '#ffffff',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#4b5563'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                            Delete Edge
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default FlowchartCanvas;

