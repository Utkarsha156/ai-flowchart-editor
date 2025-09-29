import React, { useEffect, useRef, useState } from 'react';
import './ChatSidebar.css';

const ChatSidebar = ({ logChange, setNodes, setEdges, nodes, edges }) => {
    const [messages, setMessages] = useState([
        { id: 'm1', role: 'ai', text: 'Hello! I can help you visualize a process. What flowchart would you like to create?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const listRef = useRef(null);

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const sendToBackend = async (prompt, currentNodes, currentEdges) => {
        const response = await fetch('/generate-flowchart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                description: prompt,
                nodes: currentNodes,
                edges: currentEdges
            })
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'An unknown server error occurred.');
        }
        return response.json();
    };

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const userMsg = { id: `u_${Date.now()}`, role: 'user', text: trimmed };
        setMessages((msgs) => [...msgs, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const data = await sendToBackend(trimmed, nodes, edges);
            setIsLoading(false);

            if (data.requires_clarification) {
                const aiMsg = { id: `a_${Date.now()}`, role: 'ai', text: data.message };
                setMessages((msgs) => [...msgs, aiMsg]);
            } else {
                const isEditing = nodes.length > 0;
                let logType;
                let details;
                let confirmationText;

                if (isEditing) {
                    logType = 'EDIT_FLOWCHART';
                    details = `Updated from prompt: "${trimmed}"`;
                    
                    const responses = [
                        `Done! I've updated the flowchart based on your instruction.`,
                        `Alright, the change has been made as you requested.`,
                        `I've adjusted the flowchart. Let me know what you think!`
                    ];
                    confirmationText = responses[Math.floor(Math.random() * responses.length)];
                } else {
                    logType = 'GENERATE_FLOWCHART';
                    details = `Generated from prompt: "${trimmed}"`;

                    const responses = [
                        `Great! I've generated your flowchart as requested.`,
                        `Here is the flowchart based on your description.`,
                        `Done! Take a look at the generated flowchart and let me know if you need changes.`
                    ];
                    confirmationText = responses[Math.floor(Math.random() * responses.length)];
                }
                
                setNodes(data.nodes || []);
                setEdges(data.edges || []);
                logChange('AI', logType, details);

                const confirmationMsg = { 
                    id: `a_confirm_${Date.now()}`, 
                    role: 'ai', 
                    text: confirmationText
                };
                setMessages((msgs) => [...msgs, confirmationMsg]);
            }
        } catch (err) {
            setIsLoading(false);
            const errorMsg = { id: `a_err_${Date.now()}`, role: 'ai', text: `Sorry, something went wrong: ${err.message}` };
            setMessages((msgs) => [...msgs, errorMsg]);
        }
    };
    
    const onKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <aside className="sidebar">
            <div className="chat-container">
                <div ref={listRef} className="chat-messages">
                    {messages.map((m) => (
                        <div key={m.id} className={`chat-message ${m.role}`}>
                            <div className="bubble">{m.text}</div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="chat-message ai">
                            <div className="bubble typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="chat-input-row">
                    <textarea
                        className="chat-input"
                        placeholder="Describe your process or edits..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onKeyDown}
                        disabled={isLoading}
                        rows="1"
                    />
                    <button className="btn btn-primary chat-send" onClick={handleSend} disabled={isLoading || !input.trim()}>
                        Send
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default ChatSidebar;