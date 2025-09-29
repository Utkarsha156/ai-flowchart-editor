import React, { useState, useCallback } from 'react';
import { ReactFlowProvider, useNodesState, useEdgesState } from 'reactflow';
import FlowchartCanvas from './components/FlowchartCanvas';
import ChatSidebar from './components/ChatSidebar';
import HistoryPanel from './components/HistoryPanel';
import './App.css';

function App() {
    const [changeHistory, setChangeHistory] = useState([]);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const logChange = useCallback((source, type, details) => {
        const newLog = {
            timestamp: new Date().toISOString(),
            source,
            type,
            details
        };
        setChangeHistory(prevHistory => [newLog, ...prevHistory]);
    }, []);

    return (
        <ReactFlowProvider>
            <div className="app-container">
                <ChatSidebar 
                    setNodes={setNodes}
                    setEdges={setEdges}
                    logChange={logChange}
                    // UPDATED: Pass the current nodes and edges to the sidebar
                    nodes={nodes}
                    edges={edges}
                />
                <main className="main-content">
                    <FlowchartCanvas 
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