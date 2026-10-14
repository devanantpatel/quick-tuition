import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Lock, Unlock, Globe, Terminal, FileCode } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const INITIAL_WEB_CODE = {
  html: `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="card">
    <div class="tag">Live Web Engine</div>
    <h1>Hello, Quick Tuition!</h1>
    <p>Test HTML, CSS, and JS simultaneously with live preview.</p>
    <button id="actionBtn">Click to Trigger JS</button>
    <div id="output"></div>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
  css: `body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #090d16;
  font-family: system-ui, -apple-system, sans-serif;
  color: #e2e8f0;
}

.card {
  background: #111827;
  border: 1px solid #1f2937;
  padding: 24px;
  border-radius: 16px;
  text-align: center;
  max-width: 320px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.tag {
  display: inline-block;
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 9999px;
  border: 1px solid rgba(99, 102, 241, 0.4);
}

h1 { font-size: 20px; margin: 12px 0 6px; color: #fff; }
p { font-size: 13px; color: #94a3b8; margin-bottom: 16px; }

button {
  background: #6366f1;
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}
button:hover { background: #4f46e5; }
#output { margin-top: 12px; font-weight: bold; color: #34d399; font-size: 13px; }`,
  js: `document.getElementById('actionBtn').addEventListener('click', () => {
  document.getElementById('output').innerText = 'Event Triggered at ' + new Date().toLocaleTimeString();
});`
};

const INITIAL_STANDALONE_JS = `// Single File JavaScript Playground
function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

const numbers = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
const target = 23;
const index = binarySearch(numbers, target);

console.log("Array:", numbers);
console.log("Index of", target, ":", index);`;

const INITIAL_PYTHON = `# Python Simulation Playground
def fibonacci(n):
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence

result = fibonacci(8)
print("Fibonacci Series (First 8):", result)

# Demonstrating String Methods
message = "quick tuition platform"
print("Capitalized:", message.title())
print("Total Length:", len(message))`;

export default function CodePlayground({ 
  isStudentCodeAllowed, 
  setIsStudentCodeAllowed, 
  broadcast, 
  registerListener 
}) {
  const { currentUser } = useApp();
  const isTeacher = currentUser?.role === 'teacher';

  // Environment: 'web' | 'javascript' | 'python'
  const [selectedTech, setSelectedTech] = useState('web');
  
  // For Web Environment: 'html' | 'css' | 'js'
  const [activeWebFile, setActiveWebFile] = useState('html');
  const [webFiles, setWebFiles] = useState(INITIAL_WEB_CODE);

  // Standalone Single Files
  const [standaloneJs, setStandaloneJs] = useState(INITIAL_STANDALONE_JS);
  const [standalonePython, setStandalonePython] = useState(INITIAL_PYTHON);

  // Execution Output
  const [consoleOutput, setConsoleOutput] = useState('');
  const [webPreviewHtml, setWebPreviewHtml] = useState('');

  const canEdit = isTeacher || Boolean(isStudentCodeAllowed);
  const debounceTimerRef = useRef(null);

  // Compile Web files into combined iframe srcDoc
  const compileWebPreview = useCallback((filesToCompile = webFiles) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${filesToCompile.css}</style>
        </head>
        <body>
          ${filesToCompile.html}
          <script>
            try {
              ${filesToCompile.js}
            } catch(err) {
              console.error(err);
            }
          <\/script>
        </body>
      </html>
    `;
  }, [webFiles]);

  // Execute Code Logic
  const runCodeLogic = useCallback((tech = selectedTech, currentFiles = webFiles, jsCode = standaloneJs, pyCode = standalonePython) => {
    if (tech === 'web') {
      const compiled = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>${currentFiles.css}</style>
          </head>
          <body>
            ${currentFiles.html}
            <script>
              try {
                ${currentFiles.js}
              } catch(err) {
                console.error(err);
              }
            <\/script>
          </body>
        </html>
      `;
      setWebPreviewHtml(compiled);
      setConsoleOutput('Live Web project built & rendered into viewport.');
      return compiled;
    }

    if (tech === 'javascript') {
      try {
        let logs = [];
        const customConsole = {
          log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
          error: (...args) => logs.push('❌ Error: ' + args.join(' ')),
          warn: (...args) => logs.push('⚠️ Warning: ' + args.join(' '))
        };
        const runFn = new Function('console', jsCode);
        runFn(customConsole);
        const out = logs.join('\n') || 'Executed successfully with no console output.';
        setConsoleOutput(out);
        return out;
      } catch (err) {
        const errOut = `❌ JavaScript Runtime Error:\n${err.message}`;
        setConsoleOutput(errOut);
        return errOut;
      }
    }

    if (tech === 'python') {
      try {
        let logs = [];
        const lines = pyCode.split('\n');

        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;

          if (trimmed.startsWith('print(') && trimmed.endsWith(')')) {
            const inner = trimmed.substring(6, trimmed.length - 1);
            try {
              let sanitized = inner
                .replace(/True/g, 'true')
                .replace(/False/g, 'false')
                .replace(/None/g, 'null')
                .replace(/len\(/g, '((x)=>x.length)(') .replace(/\.title\(\)/g, '.replace(/\\b\\w/g, c=>c.toUpperCase())');
              logs.push(eval(sanitized));
            } catch {
              logs.push(inner.replace(/['"]/g, ''));
            }
          }
        });

        const out = logs.join('\n') || 'Python script executed successfully.';
        setConsoleOutput(out);
        return out;
      } catch (err) {
        const errOut = `❌ Python Simulation Error:\n${err.message}`;
        setConsoleOutput(errOut);
        return errOut;
      }
    }
  }, [selectedTech, webFiles, standaloneJs, standalonePython]);

  // Run Code and broadcast trigger to peer
  const handleRunCode = () => {
    setConsoleOutput('Executing...\n');
    const result = runCodeLogic();

    if (broadcast) {
      broadcast('code:run_triggered', {
        tech: selectedTech,
        resultOutput: typeof result === 'string' ? result : ''
      });
    }
  };

  // Real-Time Listeners (Live Updates + Rejoin Full State Sync)
  useEffect(() => {
    if (!registerListener) return;

    // 1. Live Typing Updates
    registerListener('code:content_update', (payload) => {
      if (!payload) return;
      if (payload.tech === 'web' && payload.webFiles) {
        setWebFiles(payload.webFiles);
      } else if (payload.tech === 'javascript' && payload.code !== undefined) {
        setStandaloneJs(payload.code);
      } else if (payload.tech === 'python' && payload.code !== undefined) {
        setStandalonePython(payload.code);
      }
    });

    // 2. Environment / Tab Change
    registerListener('code:env_switch', (payload) => {
      if (!payload) return;
      if (payload.selectedTech) setSelectedTech(payload.selectedTech);
      if (payload.activeWebFile) setActiveWebFile(payload.activeWebFile);
    });

    // 3. Remote Run Trigger
    registerListener('code:run_triggered', (payload) => {
      if (!payload) return;
      runCodeLogic(payload.tech);
    });

    // 4. Clear Trigger
    registerListener('code:clear_output', () => {
      setConsoleOutput('');
      setWebPreviewHtml('');
    });

    // 5. Rejoin State Provider: Jab koi doosra user rejoin kare aur full state maange
    registerListener('code:request_full_state', () => {
      if (broadcast) {
        broadcast('code:sync_full_state', {
          selectedTech,
          activeWebFile,
          webFiles,
          standaloneJs,
          standalonePython
        });
      }
    });

    // 6. Rejoin State Receiver: Samne wale se full state lekar update kare
    registerListener('code:sync_full_state', (payload) => {
      if (!payload) return;
      if (payload.selectedTech) setSelectedTech(payload.selectedTech);
      if (payload.activeWebFile) setActiveWebFile(payload.activeWebFile);
      if (payload.webFiles) setWebFiles(payload.webFiles);
      if (payload.standaloneJs !== undefined) setStandaloneJs(payload.standaloneJs);
      if (payload.standalonePython !== undefined) setStandalonePython(payload.standalonePython);
    });
  }, [registerListener, runCodeLogic, broadcast, selectedTech, activeWebFile, webFiles, standaloneJs, standalonePython]);

  // Rejoin hone par 800ms baad room se full code state maango
  useEffect(() => {
    if (broadcast) {
      const syncTimer = setTimeout(() => {
        broadcast('code:request_full_state', {});
      }, 800);
      return () => clearTimeout(syncTimer);
    }
  }, [broadcast]);

  // Determine current code & language for Monaco
  let currentMonacoCode = '';
  let currentMonacoLang = 'javascript';

  if (selectedTech === 'web') {
    currentMonacoCode = webFiles[activeWebFile];
    currentMonacoLang = activeWebFile === 'html' ? 'html' : activeWebFile === 'css' ? 'css' : 'javascript';
  } else if (selectedTech === 'javascript') {
    currentMonacoCode = standaloneJs;
    currentMonacoLang = 'javascript';
  } else if (selectedTech === 'python') {
    currentMonacoCode = standalonePython;
    currentMonacoLang = 'python';
  }

  // Handle Editor Typing with Debounced Broadcast
  const handleEditorChange = (val) => {
    if (!canEdit) return;
    const nextVal = val || '';

    let nextWebFiles = webFiles;
    let nextJs = standaloneJs;
    let nextPy = standalonePython;

    if (selectedTech === 'web') {
      nextWebFiles = { ...webFiles, [activeWebFile]: nextVal };
      setWebFiles(nextWebFiles);
    } else if (selectedTech === 'javascript') {
      nextJs = nextVal;
      setStandaloneJs(nextJs);
    } else if (selectedTech === 'python') {
      nextPy = nextVal;
      setStandalonePython(nextPy);
    }

    if (broadcast) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        broadcast('code:content_update', {
          tech: selectedTech,
          activeFile: activeWebFile,
          webFiles: nextWebFiles,
          code: selectedTech === 'javascript' ? nextJs : nextPy
        });
      }, 300);
    }
  };

  // Environment Switch Handler
  const handleTechChange = (tech) => {
    setSelectedTech(tech);
    setConsoleOutput('');
    if (tech === 'web') setWebPreviewHtml(compileWebPreview());

    if (broadcast) {
      broadcast('code:env_switch', { selectedTech: tech, activeWebFile });
    }
  };

  // Web Tab Switch Handler
  const handleWebFileChange = (fileName) => {
    setActiveWebFile(fileName);
    if (broadcast) {
      broadcast('code:env_switch', { selectedTech, activeWebFile: fileName });
    }
  };

  // Clear Output
  const handleClearOutput = () => {
    setConsoleOutput('');
    setWebPreviewHtml('');
    if (broadcast) {
      broadcast('code:clear_output', {});
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-slate-950 overflow-hidden font-mono text-xs min-h-0">
      
      {/* LEFT: Monaco Editor Workspace */}
      <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 min-h-0">
        
        {/* Top Control Bar */}
        <div className="bg-slate-900 px-4 py-2 flex flex-wrap items-center justify-between border-b border-slate-800 gap-2 shrink-0">
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-sans font-semibold">Environment:</span>
              <select
                value={selectedTech}
                onChange={(e) => handleTechChange(e.target.value)}
                className="bg-transparent text-white font-sans font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="web" className="bg-slate-900">🌐 Web Stack (HTML + CSS + JS)</option>
                <option value="javascript" className="bg-slate-900">⚡ JavaScript (Node / Pure JS)</option>
                <option value="python" className="bg-slate-900">🐍 Python 3</option>
              </select>
            </div>

            {!canEdit && (
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-sans font-semibold">
                <Lock className="w-3 h-3" /> Read Only
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Host Lock Control */}
            {isTeacher && (
              <button
                onClick={() => setIsStudentCodeAllowed(!isStudentCodeAllowed)}
                className={`text-[11px] font-sans font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1 transition ${
                  isStudentCodeAllowed ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {isStudentCodeAllowed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{isStudentCodeAllowed ? 'Student Edit: ON' : 'Student Edit: OFF'}</span>
              </button>
            )}

            <button
              onClick={handleRunCode}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-md shadow-emerald-600/20"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{selectedTech === 'web' ? 'Build & Run Web' : 'Run Script'}</span>
            </button>
          </div>
        </div>

        {/* Multi-File Tabs (Only for Web Environment) */}
        {selectedTech === 'web' && (
          <div className="flex bg-slate-950 border-b border-slate-800/80 px-2 text-xs font-mono shrink-0">
            <button
              onClick={() => handleWebFileChange('html')}
              className={`px-3 py-1.5 flex items-center gap-1.5 border-b-2 font-semibold transition ${
                activeWebFile === 'html' ? 'border-orange-500 text-orange-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" /> index.html
            </button>

            <button
              onClick={() => handleWebFileChange('css')}
              className={`px-3 py-1.5 flex items-center gap-1.5 border-b-2 font-semibold transition ${
                activeWebFile === 'css' ? 'border-cyan-500 text-cyan-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" /> style.css
            </button>

            <button
              onClick={() => handleWebFileChange('js')}
              className={`px-3 py-1.5 flex items-center gap-1.5 border-b-2 font-semibold transition ${
                activeWebFile === 'js' ? 'border-amber-500 text-amber-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" /> script.js
            </button>
          </div>
        )}

        {/* Monaco Editor Instance */}
        <div className="flex-1 w-full h-full min-h-0">
          <Editor
            height="100%"
            theme="vs-dark"
            language={currentMonacoLang}
            value={currentMonacoCode}
            onChange={handleEditorChange}
            options={{
              readOnly: !canEdit,
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'Fira Code', 'Courier New', monospace",
              tabSize: 2,
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              formatOnType: true,
              formatOnPaste: true,
              suggestOnTriggerCharacters: true
            }}
          />
        </div>
      </div>

      {/* RIGHT: Output Panel */}
      <div className="w-full md:w-80 lg:w-96 bg-slate-950 flex flex-col border-t md:border-t-0 border-slate-800 min-h-0 shrink-0">
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-1.5">
            {selectedTech === 'web' ? <Globe className="w-3.5 h-3.5 text-cyan-400" /> : <Terminal className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="text-slate-300 font-semibold text-[11px] font-sans">
              {selectedTech === 'web' ? 'Live Browser Viewport' : 'Console / Execution Logs'}
            </span>
          </div>

          <button 
            onClick={handleClearOutput} 
            className="text-slate-500 hover:text-white p-1"
            title="Clear Console / View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {selectedTech === 'web' ? (
          <div className="flex-1 w-full h-full bg-white overflow-hidden relative min-h-0">
            <iframe
              title="Web Sandbox Preview"
              srcDoc={webPreviewHtml || compileWebPreview()}
              sandbox="allow-scripts"
              className="w-full h-full border-0"
            />
          </div>
        ) : (
          <div className="flex-1 p-3.5 text-emerald-400 overflow-y-auto whitespace-pre-wrap leading-relaxed text-[11px] bg-[#020617] font-mono select-text min-h-0">
            {consoleOutput || '// Click "Run Script" to inspect terminal logs & errors.'}
          </div>
        )}
      </div>
    </div>
  );
}