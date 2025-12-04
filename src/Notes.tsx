import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Save, FileText, Clock, Trash2, Briefcase, HardHat } from 'lucide-react';

type Note = {
  id: number;
  text: string;
  time: string;
};

type UserSession = {
  username: string;
  role: 'employer' | 'worker';
};

export default function Notes() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);

  // 1. Check Session on Mount
  useEffect(() => {
    const sessionStr = localStorage.getItem('currentUser');
    
    if (!sessionStr) {
      navigate('/');
      return;
    }

    try {
      // Try to parse the new JSON format { username, role }
      const sessionData = JSON.parse(sessionStr);
      
      // Handle case where sessionData might be just a string (legacy support)
      if (typeof sessionData === 'string') {
        const legacyUser = { username: sessionData, role: 'worker' as const };
        setCurrentUser(legacyUser);
        loadNotes(legacyUser.username);
      } else {
        setCurrentUser(sessionData);
        loadNotes(sessionData.username);
      }
    } catch (e) {
      // Fallback if JSON parse fails (it's a plain string)
      const legacyUser = { username: sessionStr, role: 'worker' as const };
      setCurrentUser(legacyUser);
      loadNotes(legacyUser.username);
    }
  }, [navigate]);

  // 2. Load Notes for specific user
  const loadNotes = (username: string) => {
    const savedNotes = localStorage.getItem(`notes_${username}`);
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  };

  // 3. Save Note
  const handleSaveNote = () => {
    if (!noteText.trim() || !currentUser) return;

    const now = new Date();
    const newNote: Note = {
      id: Date.now(),
      text: noteText,
      time: now.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };

    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    localStorage.setItem(`notes_${currentUser.username}`, JSON.stringify(updatedNotes));
    setNoteText('');
  };

  // 4. Delete Note
  const handleDeleteNote = (id: number) => {
    if (!currentUser) return;
    const updatedNotes = notes.filter(note => note.id !== id);
    setNotes(updatedNotes);
    localStorage.setItem(`notes_${currentUser.username}`, JSON.stringify(updatedNotes));
  };

  // 5. Logout
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="text-blue-600" />
              Notes Demo
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-500 text-sm">
                Welcome, <span className="font-semibold text-blue-600">{currentUser.username}</span>
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                currentUser.role === 'employer' 
                  ? 'bg-purple-50 text-purple-700 border-purple-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {currentUser.role === 'employer' ? <Briefcase size={10} /> : <HardHat size={10} />}
                {currentUser.role === 'employer' ? 'Employer' : 'Worker'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        {/* Note Input Area */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <label htmlFor="note-input" className="block text-sm font-medium text-gray-700 mb-2">
            Write a new note
          </label>
          <textarea
            id="note-input"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your note here..."
            className="w-full h-32 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all bg-gray-50 focus:bg-white"
          ></textarea>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveNote}
              disabled={!noteText.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <Save size={18} />
              Save Note
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Saved Notes</h2>
          
          {notes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-3">
                <FileText className="text-gray-400" />
              </div>
              <p className="text-gray-500">No notes yet. Start writing above!</p>
            </div>
          ) : (
            notes.map((note) => (
              <div 
                key={note.id} 
                className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 group"
              >
                <div className="flex justify-between items-start gap-4">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed flex-grow">
                    {note.text}
                  </p>
                  <button 
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                    title="Delete note"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                  <Clock size={12} />
                  <span>{note.time}</span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
