import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { nanoid } from 'nanoid';
import { FiTrash } from 'react-icons/fi';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Input from './Input';
import { rollExpression } from '../utils/dice';
import highlightBattleText from '../utils/highlightBattleText';
import { getPlayerColor, MASTER_COLOR } from '../utils/playerColors';

const SPECIAL_TRAIT_COLOR = '#ef4444';
const ChatPanel = ({ playerName = '', isMaster = false }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [chatLoaded, setChatLoaded] = useState(false);
  const prevMessagesRef = useRef([]);
  const initialChat = useRef(true);

  // Load chat messages
  useEffect(() => {
    const ref = doc(db, 'assetSidebar', 'chat');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setMessages(snap.data().messages || []);
        } else {
          const stored = localStorage.getItem('sidebarChat');
          if (stored) {
            try {
              setMessages(JSON.parse(stored));
            } catch {
              // ignore
            }
          }
        }
        setChatLoaded(true);
      },
      (error) => {
        console.error(error);
        const stored = localStorage.getItem('sidebarChat');
        if (stored) {
          try {
            setMessages(JSON.parse(stored));
          } catch {
            // ignore
          }
        }
        setChatLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  // Persist chat messages
  useEffect(() => {
    if (!chatLoaded) return;
    if (initialChat.current) {
      initialChat.current = false;
      prevMessagesRef.current = messages;
      return;
    }
    if (JSON.stringify(prevMessagesRef.current) === JSON.stringify(messages)) return;
    localStorage.setItem('sidebarChat', JSON.stringify(messages));
    setDoc(doc(db, 'assetSidebar', 'chat'), { messages }).catch(console.error);
    prevMessagesRef.current = messages;
  }, [messages, chatLoaded]);

  const sendMessage = () => {
    const text = message.trim();
    if (!text) return;
    const author = isMaster ? 'Master' : playerName || 'Anónimo';
    let result = null;
    if (/^[0-9dD+\-*/().,% ]+$/.test(text) && /\d/.test(text)) {
      try {
        result = rollExpression(text);
      } catch {
        result = null;
      }
    }
    const newMsg = { id: nanoid(), author, text, result };
    setMessages((msgs) => [...msgs, newMsg]);
    setMessage('');
  };

  const deleteMessage = (id) => {
    setMessages((msgs) => msgs.filter((m) => m.id !== id));
  };

  return (
    <div className="w-[320px] bg-[#1f2937] border-l border-[#2d3748] p-3 flex flex-col overflow-y-auto overscroll-y-contain scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
      <div className="flex-1 overflow-y-auto space-y-2 mb-2">
        {messages.map((m) => (
          <div key={m.id} className="bg-gray-700/50 p-2 rounded flex items-start gap-2">
            <div className="flex-1 mr-2 min-w-0 space-y-1">
              {m.doorCheck ? (
                <div className="text-gray-200">
                  <span className="font-semibold mr-1" style={{ color: getPlayerColor(m.author), textShadow: m.author === 'Master' ? '0 0 4px ' + MASTER_COLOR : 'none' }}>{m.author}</span>
                  <span className="mr-1">intenta abrir una puerta.</span>
                  <span className={m.success ? 'text-green-400' : 'text-red-400'}>
                    {m.success ? 'Superado' : 'No superado'}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="font-semibold mr-1" style={{ color: getPlayerColor(m.author), textShadow: m.author === 'Master' ? '0 0 4px ' + MASTER_COLOR : 'none' }}>
                    {m.author}:
                  </span>
                  <span
                    className="text-gray-200 break-words"
                    dangerouslySetInnerHTML={{ __html: highlightBattleText(m.text) }}
                  />
                </div>
              )}
              {m.result && (
                <div className="bg-green-900/20 border border-green-600/50 rounded p-2 ml-4 text-xs text-gray-100 space-y-1">
                  <p className="text-center text-green-400 font-semibold">🎲 Resultado</p>
                  <div className="space-y-1">
                    {m.result.details.map((d, i) => {
                      const match = d.type === 'dice' ? d.formula.match(/d(\d+)/) : null;
                      const sides = match ? match[1] : null;
                      const img = sides && [4, 6, 8, 10, 12, 20, 100].includes(Number(sides)) ? `/dados/calculadora/calculadora-D${sides}.png` : null;
                      return (
                        <div key={i} className="bg-gray-800/50 rounded p-1 text-center">
                          {d.type === 'dice' && (
                            <span className="flex items-center justify-center gap-1">
                              {img && <img src={img} alt={`d${sides}`} className="w-4 h-4" />}
                              {d.formula}: [
                              {d.rolls.map((r, ri) => {
                                const val = typeof r === 'number' ? r : r.value;
                                const crit = typeof r === 'object' && r.critical;
                                return (
                                  <span
                                    key={ri}
                                    style={crit ? { color: SPECIAL_TRAIT_COLOR } : {}}
                                  >
                                    {val}
                                    {ri < d.rolls.length - 1 ? ', ' : ''}
                                  </span>
                                );
                              })}
                              ] = {d.subtotal}
                            </span>
                          )}
                          {d.type === 'modifier' && <span>Modificador: {d.formula}</span>}
                          {d.type === 'calc' && <span>Resultado: {d.value}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-center text-green-400 font-bold">Total: {m.result.total}</div>
                </div>
              )}
            </div>
            {isMaster && (
              <button onClick={() => deleteMessage(m.id)} className="text-red-400 hover:text-red-300 flex-shrink-0">
                <FiTrash />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder="Mensaje..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage();
          }}
        />
        <button
          className="text-xs bg-[#374151] hover:bg-[#4b5563] rounded px-2 py-1 transition-colors duration-150"
          onClick={sendMessage}
        >
          Enviar
        </button>
      </div>
    </div>
  );
};

ChatPanel.propTypes = {
  playerName: PropTypes.string,
  isMaster: PropTypes.bool,
};

export default ChatPanel;
