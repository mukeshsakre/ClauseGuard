import React, { useState, useRef, useEffect } from 'react';
import { 
  ChatSession, 
  ChatMessage, 
  AttachedFile, 
  ContractDocument, 
  QuestionVerdict 
} from '../../types';
import { ask } from '../../api/client';
import { 
  Plus, 
  Pin, 
  PinOff, 
  Search, 
  MessageSquare, 
  Paperclip, 
  ArrowUp, 
  FileText, 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  Copy, 
  Check, 
  Layers, 
  BookOpen, 
  SlidersHorizontal, 
  ChevronDown, 
  Trash2, 
  CornerDownLeft,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Clock,
  RotateCcw
} from 'lucide-react';

interface ClaudeChatDashboardProps {
  sessions: ChatSession[];
  contracts: ContractDocument[];
  onAddSession?: (newSession: ChatSession) => void;
  onUpdateSession?: (session: ChatSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  onRunQuery?: (query: string, scope: 'single' | 'portfolio', contractId?: string) => void;
}

export const ClaudeChatDashboard: React.FC<ClaudeChatDashboardProps> = ({
  sessions: initialSessions,
  contracts,
  onAddSession,
  onUpdateSession,
  onDeleteSession
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(initialSessions[0]?.id || 'chat-01');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Input State
  const [inputText, setInputText] = useState<string>('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [selectedScope, setSelectedScope] = useState<'single' | 'portfolio'>('single');
  const [selectedContractId, setSelectedContractId] = useState<string>(contracts[0]?.id || '');
  useEffect(() => {
    if (contracts.length > 0 && !contracts.some((contract) => contract.id === selectedContractId)) {
      setSelectedContractId(contracts[0].id);
    }
  }, [contracts, selectedContractId]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedCitationId, setCopiedCitationId] = useState<string | null>(null);
  const [copiedResponseId, setCopiedResponseId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Active session
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isGenerating]);

  // Handle File Upload from Input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: AttachedFile[] = Array.from(files).map((file, idx) => ({
      id: `att-${Date.now()}-${idx}`,
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      type: file.type || 'application/pdf',
      status: 'ready'
    }));

    setAttachedFiles(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Create New Chat
  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: `chat-${Date.now()}`,
      title: 'New Contract Analysis',
      timestamp: 'Just now',
      updatedAt: new Date().toISOString(),
      isPinned: false,
      scope: selectedScope,
      contractId: selectedScope === 'single' ? selectedContractId : undefined,
      contractName: selectedScope === 'single' ? contracts.find(c => c.id === selectedContractId)?.name : undefined,
      messages: []
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    onAddSession?.(newSession);
  };

  // Toggle Pin on Chat
  const togglePin = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s))
    );
  };

  // Delete Chat
  const handleDeleteChat = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = sessions.filter(s => s.id !== sessionId);
    setSessions(remaining);
    onDeleteSession?.(sessionId);
    if (activeSessionId === sessionId && remaining.length > 0) {
      setActiveSessionId(remaining[0].id);
    }
  };

  // Send Message
  const handleSendMessage = () => {
    if ((!inputText.trim() && attachedFiles.length === 0) || isGenerating) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: inputText.trim(),
      attachedFiles: attachedFiles.length > 0 ? [...attachedFiles] : undefined
    };

    const targetDoc = contracts.find(c => c.id === selectedContractId);

    // Update active session with user message
    const updatedMessages = [...(activeSession?.messages || []), userMessage];
    const sessionTitle = activeSession.messages.length === 0 && inputText.trim() 
      ? inputText.trim().slice(0, 38) + (inputText.length > 38 ? '...' : '') 
      : activeSession.title;

    const updatedSession: ChatSession = {
      ...activeSession,
      title: sessionTitle,
      scope: selectedScope,
      contractId: selectedScope === 'single' ? selectedContractId : undefined,
      contractName: selectedScope === 'single' ? targetDoc?.name : undefined,
      messages: updatedMessages
    };

    setSessions(prev => prev.map(s => s.id === activeSession.id ? updatedSession : s));
    setInputText('');
    setAttachedFiles([]);
    setIsGenerating(true);

    void (async () => {
      const started = Date.now();
      let generatedVerdict: QuestionVerdict;
      try {
        if (selectedScope === 'single' && !contracts.some((contract) => contract.id === selectedContractId)) {
          throw new Error('Upload a contract before asking about one document.');
        }
        const result = await ask(userMessage.text, selectedScope === 'single' ? selectedContractId : undefined);
        const verdictType: QuestionVerdict['verdict'] =
          result.verdict === 'compliant' ? 'Compliant'
          : result.verdict === 'non-compliant' ? 'Non-Compliant'
          : result.verdict === 'ambiguous' ? 'Ambiguous'
          : 'Unchecked';
        const verified = result.citations.some((item) => item.verified);
        generatedVerdict = {
          id: `v-${Date.now()}`,
          query: userMessage.text,
          scope: selectedScope,
          selectedContractId: selectedScope === 'single' ? selectedContractId : undefined,
          selectedContractName: selectedScope === 'single' ? targetDoc?.name : undefined,
          verdict: verdictType,
          confidenceScore: verified ? 100 : 0,
          groundingScore: verified ? 100 : 0,
          summary: result.summary,
          keyFindings: [result.reason || 'Checked against the stored text.'],
          recommendedAction: verdictType === 'Unchecked'
            ? 'Do not treat this as clearance. The clause was not verified.'
            : 'Read the cited text before acting on the verdict.',
          citations: result.citations.map((item) => ({
            clauseId: item.chunk_id,
            contractId: item.document_id,
            contractName: targetDoc?.name || item.document_id,
            sectionNumber: item.row_header ? `Row ${item.row_index}` : `Page ${item.page}`,
            sectionTitle: item.column_header || 'Stored clause',
            text: item.quote,
            pageNumber: item.page,
            relevanceScore: item.verified ? 1 : 0,
            matchType: 'Hybrid BM25',
          })),
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          evaluatedModel: String(result.pipeline.judge_model || 'configured-model'),
          latencyMs: Date.now() - started,
          tokensUsed: 1,
        };
      } catch (error) {
        generatedVerdict = {
          id: `v-${Date.now()}`,
          query: userMessage.text,
          scope: selectedScope,
          verdict: 'Unchecked',
          confidenceScore: 0,
          groundingScore: 0,
          summary: error instanceof Error ? error.message : 'The API did not answer.',
          keyFindings: ['Start the API on port 8000 and upload a contract first.'],
          recommendedAction: 'Check the service, then ask again.',
          citations: [],
          timestamp: new Date().toISOString(),
          evaluatedModel: 'unavailable',
          latencyMs: Date.now() - started,
          tokensUsed: 0,
        };
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `**Verdict**: **${generatedVerdict.verdict.toUpperCase()}**\n\n${generatedVerdict.summary}`,
        verdict: generatedVerdict,
      };
      const finalSession: ChatSession = {
        ...updatedSession,
        messages: [...updatedMessages, assistantMessage],
      };
      setSessions((prev) => prev.map((s) => s.id === activeSession.id ? finalSession : s));
      setIsGenerating(false);
      onUpdateSession?.(finalSession);
      window.dispatchEvent(new Event('clauseguard-refresh'));
    })();
  };

  const copyText = (text: string, id: string, type: 'citation' | 'response') => {
    navigator.clipboard.writeText(text);
    if (type === 'citation') {
      setCopiedCitationId(id);
      setTimeout(() => setCopiedCitationId(null), 2000);
    } else {
      setCopiedResponseId(id);
      setTimeout(() => setCopiedResponseId(null), 2000);
    }
  };

  // Filtered Sessions
  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pinnedSessions = filteredSessions.filter(s => s.isPinned);
  const recentSessions = filteredSessions.filter(s => !s.isPinned);

  const presetQueries = [
    { title: 'Check Uncapped Liability', desc: 'Scan for uncapped exposure or super-caps in vendor MSAs.' },
    { title: 'EU SCC Transfer Compliance', desc: 'Verify 2021 Module 2 Standard Contractual Clauses.' },
    { title: 'Auto-Renewal Windows', desc: 'Find agreements with non-cancelable renewals in Q4 2026.' },
    { title: 'IP Indemnification Carveouts', desc: 'Verify mutual intellectual property defense obligations.' }
  ];

  return (
    <div className="flex h-[calc(100vh-65px)] bg-[#F5F4F0] overflow-hidden">
      {/* Hidden File Input for Paperclip */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept=".pdf,.docx,.txt"
        className="hidden"
      />

      {/* LEFT SIDEBAR - Claude Style Session History */}
      <aside className="w-80 bg-[#FAF9F5] border-r border-zinc-200/80 flex flex-col shrink-0">
        {/* New Chat Button */}
        <div className="p-4 border-b border-zinc-200/70">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition-all shadow-xs group"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
              <span>Start new analysis</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono bg-zinc-800 px-1.5 py-0.5 rounded">⌘K</span>
          </button>

          {/* Search sessions */}
          <div className="relative mt-3">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-zinc-200/80 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Pinned Chats */}
          {pinnedSessions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-3 mb-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <Pin className="w-3 h-3 text-zinc-500" />
                <span>Pinned</span>
              </div>
              <div className="space-y-1">
                {pinnedSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                      activeSessionId === session.id
                        ? 'bg-white text-zinc-950 font-semibold shadow-xs border border-zinc-200/80'
                        : 'text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{session.title}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => togglePin(session.id, e)}
                        className="p-1 hover:text-zinc-950 text-zinc-400 rounded"
                        title="Unpin chat"
                      >
                        <PinOff className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteChat(session.id, e)}
                        className="p-1 hover:text-rose-600 text-zinc-400 rounded"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Chats */}
          <div>
            <div className="px-3 mb-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Recent Analyses
            </div>
            <div className="space-y-1">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                    activeSessionId === session.id
                      ? 'bg-white text-zinc-950 font-semibold shadow-xs border border-zinc-200/80'
                      : 'text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden pr-2">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{session.title}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => togglePin(session.id, e)}
                      className="p-1 hover:text-zinc-950 text-zinc-400 rounded"
                      title="Pin chat"
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteChat(session.id, e)}
                      className="p-1 hover:text-rose-600 text-zinc-400 rounded"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer - Target Scope Indicator */}
        <div className="p-3 border-t border-zinc-200/70 bg-[#F5F4F0]/60 text-xs">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px]">Active Knowledge Base:</span>
            <span className="font-semibold text-zinc-900 font-mono text-[11px]">{contracts.length} Agreements</span>
          </div>
        </div>
      </aside>

      {/* MAIN CHAT AREA - Claude UI */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Chat Top Bar */}
        <div className="h-14 bg-white/70 backdrop-blur-xs border-b border-zinc-200/80 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-zinc-950 truncate max-w-md">
              {activeSession?.title || 'Contract Analysis'}
            </h2>
            <span className="text-zinc-300">|</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700">
              <Layers className="w-3 h-3 text-zinc-500" />
              {activeSession?.scope === 'portfolio' ? 'Entire Portfolio' : 'Single Target Agreement'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-semibold text-zinc-800">Claude 3.5 Sonnet</span>
              <span className="text-zinc-400 text-[10px]">(Legal Fine-Tuned)</span>
            </div>

            <button
              onClick={() => togglePin(activeSession.id, { stopPropagation: () => {} } as any)}
              className={`p-2 rounded-xl border transition-colors ${
                activeSession?.isPinned 
                  ? 'bg-zinc-950 text-white border-zinc-950' 
                  : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900'
              }`}
              title={activeSession?.isPinned ? 'Pinned' : 'Pin conversation'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {(!activeSession?.messages || activeSession.messages.length === 0) ? (
            /* Claude Welcome Screen */
            <div className="py-12 text-center max-w-2xl mx-auto space-y-8">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-3xl bg-white border border-zinc-200 shadow-sm mx-auto flex items-center justify-center">
                  <BookOpen className="w-7 h-7 text-zinc-900" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
                  Good morning, Michael.
                </h1>
                <p className="text-sm text-zinc-600 leading-relaxed max-w-lg mx-auto">
                  Ask any question about your contract portfolio, compare terms against enterprise risk standards, or attach new agreements directly to analyze.
                </p>
              </div>

              {/* Preset Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {presetQueries.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(preset.desc);
                    }}
                    className="p-4 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-zinc-900 group-hover:text-zinc-950">
                        {preset.title}
                      </span>
                      <CornerDownLeft className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-600 transition-colors" />
                    </div>
                    <p className="text-xs text-zinc-500">{preset.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Thread */
            activeSession.messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* User Message */}
                {message.sender === 'user' ? (
                  <div className="max-w-2xl space-y-2">
                    {/* Attached files chip */}
                    {message.attachedFiles && message.attachedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-end">
                        {message.attachedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-zinc-200/90 shadow-xs text-xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-zinc-600" />
                            <span className="font-semibold text-zinc-800">{file.name}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">({file.size})</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="px-5 py-3.5 rounded-3xl bg-zinc-950 text-white text-xs sm:text-sm leading-relaxed shadow-xs">
                      {message.text}
                    </div>
                    <span className="text-[10px] text-zinc-400 block text-right pr-2">
                      {message.timestamp}
                    </span>
                  </div>
                ) : (
                  /* Assistant / Claude Response */
                  <div className="max-w-3xl w-full space-y-4">
                    {/* Verdict Banner Card */}
                    {message.verdict && (
                      <div className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                                message.verdict.verdict === 'Compliant'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : message.verdict.verdict === 'Non-Compliant'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {message.verdict.verdict.toUpperCase()}
                            </span>
                            <span className="text-xs font-medium text-zinc-500">
                              {message.verdict.confidenceScore}% Confidence · {message.verdict.groundingScore}% Grounded
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <Clock className="w-3 h-3" />
                            <span>{message.verdict.latencyMs}ms</span>
                          </div>
                        </div>

                        {/* Synthesis Markdown */}
                        <div className="pt-3 text-xs sm:text-sm text-zinc-800 leading-relaxed space-y-2 whitespace-pre-line">
                          {message.text}
                        </div>

                        {/* Cited Clauses Section */}
                        {message.verdict.citations && message.verdict.citations.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-zinc-100 space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-zinc-900">
                              <span className="flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                                Cited Clause Verification ({message.verdict.citations.length})
                              </span>
                            </div>

                            {message.verdict.citations.map((cite) => (
                              <div
                                key={cite.clauseId}
                                className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2 text-xs"
                              >
                                <div className="flex items-center justify-between font-semibold text-zinc-900">
                                  <span>{cite.sectionNumber}: {cite.sectionTitle}</span>
                                  <span className="text-[11px] text-zinc-500 font-mono">Page {cite.pageNumber}</span>
                                </div>
                                <blockquote className="italic text-zinc-700 border-l-2 border-zinc-300 pl-2.5">
                                  "{cite.text}"
                                </blockquote>
                                <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                                  <span>{cite.contractName}</span>
                                  <button
                                    onClick={() => copyText(cite.text, cite.clauseId, 'citation')}
                                    className="flex items-center gap-1 text-zinc-600 hover:text-zinc-950 font-medium"
                                  >
                                    {copiedCitationId === cite.clauseId ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        <span>Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy Clause</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Toolbar */}
                        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                          <button
                            onClick={() => copyText(message.text, message.id, 'response')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors"
                          >
                            {copiedResponseId === message.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Copied to Clipboard</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Copy Analysis</span>
                              </>
                            )}
                          </button>

                          <div className="text-[11px] text-zinc-400">
                            Model: <strong>{message.verdict.evaluatedModel}</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Typing / Generating Indicator */}
          {isGenerating && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-zinc-200 max-w-xs shadow-xs animate-pulse">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
              <span className="text-xs font-semibold text-zinc-700">Synthesizing legal opinion...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* BOTTOM INPUT CONTAINER - Claude Style */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-[#F5F4F0] via-[#F5F4F0] to-transparent shrink-0">
          <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-zinc-200/90 shadow-sm p-3.5 space-y-3">
            {/* Attached file chips in input container */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1 px-1">
                {attachedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-800"
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{file.name}</span>
                    <button
                      onClick={() => removeAttachment(file.id)}
                      className="p-0.5 hover:text-rose-600 text-zinc-400 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Main Textarea */}
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask ClauseGuard about clauses, liabilities, SCCs, or attach agreements to analyze..."
              className="w-full bg-transparent resize-none outline-none text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 px-2 leading-relaxed"
            />

            {/* Input Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100">
              <div className="flex items-center gap-2">
                {/* Paperclip / File Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200/80 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors"
                  title="Attach PDF or DOCX contract"
                >
                  <Paperclip className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="hidden sm:inline">Attach Contract</span>
                </button>

                {/* Scope Selector: Single Contract vs Portfolio */}
                <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setSelectedScope('single')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedScope === 'single'
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Single Contract
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedScope('portfolio')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedScope === 'portfolio'
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Entire Portfolio
                  </button>
                </div>

                {/* Contract Picker when in Single Mode */}
                {selectedScope === 'single' && (
                  <select
                    value={selectedContractId}
                    onChange={(e) => setSelectedContractId(e.target.value)}
                    className="max-w-[200px] truncate bg-white px-2.5 py-1 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-800 outline-none cursor-pointer"
                  >
                    {contracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Send Button */}
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={(!inputText.trim() && attachedFiles.length === 0) || isGenerating}
                className={`p-2.5 rounded-2xl transition-all ${
                  (inputText.trim() || attachedFiles.length > 0) && !isGenerating
                    ? 'bg-zinc-950 text-white shadow-xs hover:bg-zinc-800 cursor-pointer'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
