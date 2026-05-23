import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Phone, Delete, Loader2, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function USSDSimulator() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [input, setInput] = useState('');
  const [sessionId] = useState(() => `SIM-${Date.now()}`);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [history, setHistory] = useState([]);
  const [inputBuffer, setInputBuffer] = useState('');

  const isStarted = !!response;

  const dial = async () => {
    if (!phoneNumber || phoneNumber.length < 9) return;
    setLoading(true);
    setHistory([]);
    setInput('');
    setInputBuffer('');
    setSessionEnded(false);
    const res = await base44.functions.invoke('ussdHandler', {
      sessionId,
      phoneNumber,
      text: '',
      serviceCode: '*185#',
    });
    const text = res?.data || res?.text || '';
    setResponse(text);
    setHistory([{ prompt: 'DIAL *185#', response: text }]);
    setSessionEnded(text.startsWith('END'));
    setLoading(false);
  };

  const sendInput = async () => {
    if (!inputBuffer.trim() || sessionEnded) return;
    const newText = input ? `${input}*${inputBuffer}` : inputBuffer;
    setLoading(true);
    const res = await base44.functions.invoke('ussdHandler', {
      sessionId,
      phoneNumber,
      text: newText,
      serviceCode: '*185#',
    });
    const text = res?.data || res?.text || '';
    setInput(newText);
    setHistory(h => [...h, { prompt: inputBuffer, response: text }]);
    setResponse(text);
    setSessionEnded(text.startsWith('END'));
    setInputBuffer('');
    setLoading(false);
  };

  const reset = () => {
    setResponse('');
    setInput('');
    setInputBuffer('');
    setSessionEnded(false);
    setHistory([]);
  };

  const KEYPAD = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['*','0','#'],
  ];

  const pressKey = (k) => {
    if (['*', '#'].includes(k)) return;
    setInputBuffer(b => b + k);
  };

  const displayText = response.replace(/^(CON|END) /, '');

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 pb-28">
      <div className="w-full max-w-xs">
        {/* Phone Frame */}
        <div className="bg-gray-900 rounded-[2.5rem] p-4 shadow-2xl border border-gray-800">
          {/* Screen */}
          <div className="bg-black rounded-2xl p-4 mb-4 min-h-48 flex flex-col justify-between" style={{ minHeight: 220 }}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 text-[10px] font-mono">MTN USSD *185#</span>
                </div>
                {isStarted && (
                  <button onClick={reset} className="text-gray-500 hover:text-gray-300">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-gray-400 mt-6">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-mono">Connecting…</span>
                </div>
              ) : !isStarted ? (
                <div className="text-center mt-4">
                  <Phone className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-xs font-mono">Enter phone number & dial</p>
                </div>
              ) : (
                <div>
                  <pre className="text-green-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">{displayText}</pre>
                  {sessionEnded && (
                    <p className="text-gray-500 text-[10px] font-mono mt-3 border-t border-gray-800 pt-2">Session ended</p>
                  )}
                </div>
              )}
            </div>

            {/* Input field */}
            {isStarted && !sessionEnded && (
              <div className="bg-gray-900 rounded-lg px-3 py-2 mt-3 flex items-center gap-2">
                <span className="text-gray-500 text-xs font-mono">{'>'}</span>
                <span className="text-white text-sm font-mono flex-1">{inputBuffer || <span className="text-gray-600">_</span>}</span>
                {inputBuffer && (
                  <button onClick={() => setInputBuffer(b => b.slice(0,-1))} className="text-gray-500">
                    <Delete className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Phone number input (before session) */}
          {!isStarted && (
            <div className="bg-gray-800 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
              <span className="text-gray-400 text-sm font-mono">+256</span>
              <input
                className="bg-transparent flex-1 text-white text-lg font-mono outline-none placeholder-gray-600"
                placeholder="7XXXXXXXX"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value.replace(/\D/g,'').slice(0,9))}
                maxLength={9}
              />
            </div>
          )}

          {/* Keypad */}
          <div className="space-y-2">
            {KEYPAD.map((row, ri) => (
              <div key={ri} className="grid grid-cols-3 gap-2">
                {row.map(k => (
                  <button
                    key={k}
                    onClick={() => pressKey(k)}
                    className="bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white font-bold h-12 rounded-xl text-lg transition-colors"
                  >
                    {k}
                  </button>
                ))}
              </div>
            ))}

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2 mt-1">
              <button
                onClick={reset}
                className="bg-red-900/40 hover:bg-red-900/60 text-red-400 font-bold h-12 rounded-xl text-xs transition-colors"
              >
                END
              </button>
              <button
                onClick={!isStarted ? dial : sendInput}
                disabled={loading || (!isStarted && phoneNumber.length < 9) || (isStarted && !inputBuffer.trim()) || sessionEnded}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold h-12 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (!isStarted ? 'DIAL' : 'SEND')}
              </button>
              <button
                onClick={() => setInputBuffer(b => b.slice(0,-1))}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold h-12 rounded-xl text-xs transition-colors"
              >
                ⌫
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 bg-gray-900 rounded-2xl p-4">
          <p className="text-gray-400 text-xs font-semibold mb-2">How to use</p>
          <ul className="text-gray-500 text-xs space-y-1">
            <li>• Enter your registered phone number</li>
            <li>• Tap DIAL to connect to *185#</li>
            <li>• Type a menu option and tap SEND</li>
            <li>• Use option 2 → 3 to repay your loan</li>
          </ul>
        </div>

        <Link to="/" className="block text-center text-gray-600 text-xs mt-4 hover:text-gray-400">← Back to App</Link>
      </div>
    </div>
  );
}