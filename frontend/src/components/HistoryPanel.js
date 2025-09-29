import React from 'react';
import './HistoryPanel.css';

const HistoryPanel = ({ history, logChange }) => {
    
    const formatTimestamp = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const exportHistory = () => {
        if (!history || history.length === 0) {
            alert("No history to export.");
            return;
        }

        // Format history with proper spacing
        let historyText = '';
        history.forEach((item, index) => {
            historyText += `[${item.timestamp}] ${item.source} - ${item.type}\n`;
            historyText += `Details: ${item.details}\n`;
            historyText += `\n`; // Single line spacing between entries
        });

        const blob = new Blob([historyText], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `flowchart_history_${new Date().toISOString()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        logChange('MANUAL', 'EXPORT_HISTORY', 'Exported the change history log.');
    };

    return (
        <aside className="history-panel">
            <div className="history-header">
                <h2>Change History</h2>
                <button className="btn btn-subtle" onClick={exportHistory}>
                    Export History
                </button>
            </div>
            <div id="history-content" className="history-content">
                {history.length === 0 ? (
                    <p>No changes yet. Generate or add a node to begin.</p>
                ) : (
                    history.map((item, index) => (
                        <div key={index} className="history-item">
                            <div className="history-item-header">
                                <span className={`history-source ${item.source === 'AI' ? 'source-ai' : 'source-manual'}`}>
                                    {item.source}
                                </span>
                                <span className="history-type">{item.type}</span>
                            </div>
                            <div className="history-details">{item.details}</div>
                            <div className="history-timestamp">{formatTimestamp(item.timestamp)}</div>
                        </div>
                    ))
                )}
            </div>
        </aside>
    );
};

export default HistoryPanel;
