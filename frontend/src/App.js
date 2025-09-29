import React, { useState, useCallback } from 'react';
import { ReactFlowProvider, useNodesState, useEdgesState } from 'reactflow';
import FlowchartCanvas from './components/FlowchartCanvas';
import ChatSidebar from './components/ChatSidebar';
import HistoryPanel from './components/HistoryPanel';
import './App.css';

function App() {
    // State to hold all changes for logging and export
    const [changeHistory, setChangeHistory] = useState([]);
    
    // The nodes and edges state is now "lifted" to the main App component.
    // This makes it the single source of truth.
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Central function to log any change made to the flowchart
    const logChange = useCallback((source, type, details) => {
        const newLog = {
            timestamp: new Date().toISOString(),
            source, // 'AI' or 'MANUAL'
            type,
            details
        };
        // Add the new log to the beginning of the array
        setChangeHistory(prevHistory => [newLog, ...prevHistory]);
    }, []);

    return (
        // ReactFlowProvider is still needed for other hooks like useReactFlow() internally
        <ReactFlowProvider>
            <div className="app-container">
                <ChatSidebar 
                    setNodes={setNodes}
                    setEdges={setEdges}
                    logChange={logChange}
                    changeHistory={changeHistory}
                />
                <main className="main-content">
                    <FlowchartCanvas 
                        // Pass all state and handlers down to the canvas
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        setNodes={setNodes}
                        setEdges={setEdges}
                        logChange={logChange} 
                    />
                </main>
                <HistoryPanel history={changeHistory} logChange={logChange} />
            </div>
        </ReactFlowProvider>
    );
}

export default App;


