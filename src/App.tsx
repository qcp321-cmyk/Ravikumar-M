import { useState, useEffect } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import { VideoPlayer } from './components/VideoPlayer';
import { motion } from 'motion/react';
import { Copy, Monitor, Users, Shield, MousePointer2, LogOut } from 'lucide-react';

export default function App() {
  const {
    roomId,
    isHost,
    peers,
    requests,
    streams,
    isConnected,
    createRoom,
    joinRoom,
    approveJoin,
    rejectJoin,
    startSharing,
    stopSharing,
    sendCursorPosition
  } = useWebRTC();

  const [username, setUsername] = useState('');
  const [joinId, setJoinId] = useState('');
  const [view, setView] = useState<'landing' | 'room'>('landing');
  const [remoteCursor, setRemoteCursor] = useState<{x: number, y: number, clientId: string} | undefined>(undefined);

  useEffect(() => {
    if (roomId) {
      setView('room');
    }
  }, [roomId]);

  useEffect(() => {
      const handleRemoteCursor = (e: Event) => {
          const customEvent = e as CustomEvent;
          setRemoteCursor({
              x: customEvent.detail.position.x,
              y: customEvent.detail.position.y,
              clientId: customEvent.detail.clientId
          });
      };
      window.addEventListener('remote-cursor', handleRemoteCursor);
      return () => window.removeEventListener('remote-cursor', handleRemoteCursor);
  }, []);

  const handleCreate = () => {
    if (!username) return alert('Please enter your name');
    createRoom(username);
  };

  const handleJoin = () => {
    if (!username || !joinId) return alert('Please enter name and Room ID');
    joinRoom(joinId, username);
  };

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      // Could add toast here
    }
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-yellow-300">
        <header className="p-6 flex justify-between items-center border-b-4 border-blue-600">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xl transform -rotate-3">K</div>
            <h1 className="text-3xl font-black tracking-tighter text-blue-900">Konnect<span className="text-red-500">ET</span></h1>
          </div>
          <div className="text-sm font-mono bg-yellow-300 px-3 py-1 rounded-full border-2 border-black transform rotate-1">
            {isConnected ? '● System Online' : '○ Connecting...'}
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <h2 className="text-7xl font-black leading-[0.9] text-blue-900">
              SHARE <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">EVERYTHING</span> <br/>
              INSTANTLY.
            </h2>
            <p className="text-xl font-medium text-neutral-500 max-w-md border-l-4 border-yellow-400 pl-4">
              Zero latency screen sharing with creative control. 
              Collaborate, present, and interact in real-time.
            </p>
            
            <div className="bg-neutral-50 p-8 rounded-3xl border-4 border-neutral-200 shadow-[8px_8px_0px_rgba(0,0,0,0.1)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Your Identity</label>
                  <input 
                    type="text" 
                    placeholder="Enter your name..." 
                    className="w-full bg-white border-2 border-neutral-300 rounded-xl px-4 py-3 font-bold text-lg focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button 
                    onClick={handleCreate}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-black text-lg shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all flex flex-col items-center gap-2"
                  >
                    <Monitor className="w-6 h-6" />
                    NEW SESSION
                  </button>
                  
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      placeholder="Room ID" 
                      className="w-full bg-white border-2 border-neutral-300 rounded-xl px-4 py-2 font-mono text-center font-bold focus:outline-none focus:border-yellow-400"
                      value={joinId}
                      onChange={e => setJoinId(e.target.value)}
                    />
                    <button 
                      onClick={handleJoin}
                      className="w-full bg-yellow-400 hover:bg-yellow-500 text-black p-2 rounded-xl font-bold border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all"
                    >
                      JOIN
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.2 }}
            className="relative hidden md:block"
          >
            <div className="absolute inset-0 bg-blue-600 rounded-[3rem] transform rotate-6 opacity-10"></div>
            <div className="absolute inset-0 bg-yellow-400 rounded-[3rem] transform -rotate-3 opacity-20"></div>
            <div className="bg-white rounded-[2.5rem] border-8 border-black overflow-hidden shadow-2xl relative z-10 aspect-square flex items-center justify-center p-12">
              <div className="grid grid-cols-2 gap-4 w-full h-full opacity-50">
                <div className="bg-neutral-100 rounded-2xl animate-pulse"></div>
                <div className="bg-blue-50 rounded-2xl"></div>
                <div className="bg-yellow-50 rounded-2xl col-span-2"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border-2 border-neutral-200 shadow-lg text-center">
                  <MousePointer2 className="w-12 h-12 text-red-500 mx-auto mb-2 animate-bounce" />
                  <p className="font-black text-blue-900">INTERACTIVE CONTROL</p>
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      {/* Room Header */}
      <header className="bg-white border-b-2 border-neutral-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black transform -rotate-3">K</div>
          <div>
            <h1 className="font-black text-xl text-blue-900 leading-none">ROOM <span className="text-blue-600 font-mono">#{roomId}</span></h1>
            <p className="text-xs text-neutral-500 font-medium mt-1">Logged in as {username}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={copyRoomId}
            className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">COPY ID</span>
          </button>
          <div className="h-8 w-px bg-neutral-300 mx-2"></div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg transition-colors"
            title="Leave Room"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full md:w-80 bg-white border-r-2 border-neutral-200 flex flex-col z-40">
          <div className="p-6 border-b border-neutral-100">
            <h3 className="font-black text-neutral-400 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participants ({peers.length + 1})
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  {username.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-bold text-blue-900 text-sm">{username} (You)</span>
                {isHost && <Shield className="w-3 h-3 text-yellow-500 ml-auto" />}
              </div>
              {peers.map(peer => (
                <div key={peer.id} className="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-600 font-bold text-xs">
                    {peer.name?.slice(0, 2).toUpperCase() || '??'}
                  </div>
                  <span className="font-medium text-neutral-700 text-sm">{peer.name}</span>
                </div>
              ))}
            </div>
          </div>

          {isHost && requests.length > 0 && (
            <div className="p-6 bg-yellow-50 border-b border-yellow-100 animate-pulse">
              <h3 className="font-black text-yellow-600 text-xs uppercase tracking-wider mb-3">
                Join Requests
              </h3>
              <div className="space-y-2">
                {requests.map(req => (
                  <div key={req.id} className="bg-white p-3 rounded-xl border border-yellow-200 shadow-sm">
                    <p className="font-bold text-sm mb-2">{req.name} wants to join</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => approveJoin(req.id)}
                        className="bg-blue-600 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-blue-700"
                      >
                        ALLOW
                      </button>
                      <button 
                        onClick={() => rejectJoin(req.id)}
                        className="bg-neutral-200 text-neutral-600 text-xs font-bold py-1.5 rounded-lg hover:bg-neutral-300"
                      >
                        DENY
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto p-6 border-t border-neutral-100">
            <button 
              onClick={streams.has('local') ? stopSharing : startSharing}
              className={`w-full py-4 rounded-xl font-black text-lg shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-2 ${
                streams.has('local') 
                  ? 'bg-red-500 text-white shadow-red-200' 
                  : 'bg-yellow-400 text-black shadow-yellow-200'
              }`}
            >
              <Monitor className="w-5 h-5" />
              {streams.has('local') ? 'STOP SHARING' : 'SHARE SCREEN'}
            </button>
            <p className="text-[10px] text-neutral-400 text-center mt-3 leading-tight">
              * Remote control features are limited to visual cursor tracking in web mode.
            </p>
          </div>
        </aside>

        {/* Main Stage */}
        <main className="flex-1 p-6 overflow-y-auto bg-neutral-100 relative">
          <div className="max-w-6xl mx-auto">
            {streams.size === 0 ? (
              <div className="h-[60vh] flex flex-col items-center justify-center text-neutral-400 border-4 border-dashed border-neutral-300 rounded-3xl">
                <Monitor className="w-16 h-16 mb-4 opacity-50" />
                <p className="font-bold text-lg">No active streams</p>
                <p className="text-sm">Click "Share Screen" to start presenting</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from(streams.entries()).map(([id, stream]) => {
                  const isLocal = id === 'local';
                  const peerName = isLocal ? username : peers.find(p => p.id === id)?.name || 'Unknown';
                  
                  return (
                    <VideoPlayer 
                      key={id}
                      stream={stream}
                      label={peerName}
                      isLocal={isLocal}
                      onCursorMove={!isLocal ? sendCursorPosition : undefined}
                      remoteCursor={isLocal ? remoteCursor : undefined}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
