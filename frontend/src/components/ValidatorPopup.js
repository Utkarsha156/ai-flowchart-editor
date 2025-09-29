import React, { useState } from 'react';
import './ValidatorPopup.css';

const ValidatorPopup = ({ nodes, edges }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Calculate validation status
    const getValidationStatus = () => {
        if (nodes.length === 0) return { status: 'neutral', message: 'No nodes', errors: [] };
        
        const edgeSourceIds = new Set(edges.map(e => e.source));
        const edgeTargetIds = new Set(edges.map(e => e.target));
        const allConnectedNodeIds = new Set([...edgeSourceIds, ...edgeTargetIds]);
        
        const errors = [];
        
        // Check for completely unconnected nodes
        nodes.forEach(node => {
            if (!allConnectedNodeIds.has(node.id)) {
                errors.push(`Node "${node.data.label}" is not connected to any other node`);
            }
        });
        
        // Check for step nodes with multiple outgoing connections
        nodes.forEach(node => {
            // Check all step-type nodes: default, input, output, and nodes without type
            if (node.type === 'default' || !node.type || node.type === 'input' || node.type === 'output') {
                const outgoingEdges = edges.filter(e => e.source === node.id);
                if (outgoingEdges.length > 1) {
                    errors.push(`Step node "${node.data.label}" cannot have more than one outgoing connection (found ${outgoingEdges.length})`);
                }
            }
        });
        
        // Check for condition nodes with improper connections
        nodes.forEach(node => {
            if (node.type === 'condition') {
                const outgoingEdges = edges.filter(e => e.source === node.id);
                if (outgoingEdges.length < 2) {
                    errors.push(`Condition node "${node.data.label}" should have at least 2 outgoing connections`);
                }
            }
        });
        
        // Check for isolated groups of nodes
        if (nodes.length > 1 && edges.length === 0) {
            errors.push('All nodes are disconnected - create connections between nodes');
        }
        
        if (errors.length === 0) {
            return { status: 'success', message: 'All checks passed', errors: [] };
        } else {
            return { status: 'error', message: `${errors.length} error(s)`, errors };
        }
    };
    
    const validation = getValidationStatus();
    
    return (
        <div className="validator-popup">
            <div 
                className={`validator-status ${validation.status}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="status-indicator">
                    <div className="status-dot"></div>
                </div>
                <span className="status-text">Flowchart Validation</span>
                <div className={`status-message ${validation.status}`}>
                    {validation.message}
                </div>
            </div>
            
            {isExpanded && (
                <div className="validator-details">
                    <div className="details-header">
                        <h4>Validation Details</h4>
                        <button 
                            className="close-btn"
                            onClick={() => setIsExpanded(false)}
                        >
                            ×
                        </button>
                    </div>
                    <div className="details-content">
                        {validation.errors.length === 0 ? (
                            <div className="success-message">
                                ✅ Your flowchart looks good! All checks passed.
                            </div>
                        ) : (
                            <div className="error-list">
                                {validation.errors.map((error, index) => (
                                    <div key={index} className="error-item">
                                        ❌ {error}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ValidatorPopup;
