import React, { useEffect, useRef, useState } from 'react';
import './ChatSidebar.css';

const ChatSidebar = ({ logChange, setNodes, setEdges, changeHistory }) => {
    const [messages, setMessages] = useState([
        { id: 'm1', role: 'ai', text: 'Tell me about the business process you want to visualise' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const listRef = useRef(null);

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages]);

    const sendToBackend = async (prompt) => {
        const response = await fetch('/generate-flowchart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: prompt })
        });
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.indexOf('application/json') !== -1) {
                const errData = await response.json();
                throw new Error(errData.error || 'An unknown server error occurred.');
            } else {
                const raw = await response.text();
                // eslint-disable-next-line no-console
                console.error('Received non-JSON response from server:', raw);
                throw new Error(`The server returned an unexpected response. Status: ${response.status}. Please check the backend console for errors.`);
            }
        }
        return response.json();
    };

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const userMsg = { id: `u_${Date.now()}`, role: 'user', text: trimmed };
        const tempAi = { id: `a_${Date.now()}`, role: 'ai', text: 'Generating…' };
        setMessages((msgs) => [...msgs, userMsg, tempAi]);
        setInput('');
        setIsLoading(true);

        try {
            const data = await sendToBackend(trimmed);
            setNodes(data.nodes || []);
            setEdges(data.edges || []);
            logChange('AI', 'GENERATE_FLOWCHART', `Generated from prompt: "${trimmed}"`);

            // Compose acknowledgment from latest change history entry
            const latest = changeHistory && changeHistory[0] ? changeHistory[0] : null;
            const ack = latest ? `ok and made changes to: ${latest.details}` : 'ok and made the requested changes.';

            setMessages((msgs) => msgs.map((m) => (m.id === tempAi.id ? { ...m, text: ack } : m)));
        } catch (err) {
            setMessages((msgs) => msgs.map((m) => (m.id === tempAi.id ? { ...m, text: `Error: ${err.message}` } : m)));
        } finally {
            setIsLoading(false);
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
                </div>
                <div className="chat-input-row">
                    <textarea
                        className="chat-input"
                        placeholder="Type your message…"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onKeyDown}
                        disabled={isLoading}
                    />
                    <button className="btn btn-primary chat-send" onClick={handleSend} disabled={isLoading}>
                        {isLoading ? 'Generating…' : 'Send'}
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default ChatSidebar;


