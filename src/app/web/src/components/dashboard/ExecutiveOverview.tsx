import React, { useState } from 'react';
import { 
  ChevronRight, 
  CreditCard, 
  Rocket, 
  Clock, 
  BarChart2, 
  SlidersHorizontal, 
  LayoutGrid, 
  ArrowLeftRight, 
  Calendar as CalendarIcon, 
  MoreVertical, 
  MousePointer, 
  Truck, 
  BarChart, 
  Sparkles,
  TrendingUp,
  FileCheck2,
  AlertTriangle,
  Play
} from 'lucide-react';
import { EndUserTab } from '../../types';

interface ExecutiveOverviewProps {
  onNavigateTab: (tab: EndUserTab) => void;
  contractsCount: number;
  violationsCount: number;
}

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  onNavigateTab,
  contractsCount,
  violationsCount
}) => {
  const [timeRange, setTimeRange] = useState<'Day' | 'Week' | '6 Month'>('Week');
  const [selectedDay, setSelectedDay] = useState<number>(8); // Th 8 active like in screenshot

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar - exactly matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Dashboard</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Contract compliance velocity, operational risk radar, and real-time clause sweeps.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Date range filter pill */}
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-zinc-200/90 shadow-xs text-xs font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
            <span>Feb 01 - Jul 30</span>
          </button>

          {/* Layout button */}
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-zinc-200/90 shadow-xs text-xs font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors">
            <LayoutGrid className="w-3.5 h-3.5 text-zinc-500" />
            <span>Layout</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards - exact styling from screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Cost Savings */}
        <div 
          onClick={() => onNavigateTab('answer_view')}
          className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-zinc-300 transition-all"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs font-medium text-zinc-600">
              <span>Cost Savings</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-zinc-950 tracking-tight">$18,400</div>
            <div className="text-xs text-zinc-500">
              <span className="text-emerald-600 font-semibold">+0.7%</span> vs last 4 month
            </div>
          </div>
          {/* Pastel sage green squircle */}
          <div className="w-12 h-12 rounded-2xl bg-[#E2EBE1] text-[#2C5234] flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Speed */}
        <div 
          onClick={() => onNavigateTab('ask_question')}
          className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-zinc-300 transition-all"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs font-medium text-zinc-600">
              <span>Speed</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-zinc-950 tracking-tight">4x</div>
            <div className="text-xs text-zinc-500">
              <span className="text-rose-500 font-semibold">-0.4%</span> vs last 4 month
            </div>
          </div>
          {/* Pastel warm peach / apricot squircle */}
          <div className="w-12 h-12 rounded-2xl bg-[#F9E6DB] text-[#8C4320] flex items-center justify-center shrink-0">
            <Rocket className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: On-Time Rate */}
        <div 
          onClick={() => onNavigateTab('upload_ingestion')}
          className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-zinc-300 transition-all"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs font-medium text-zinc-600">
              <span>On-Time Rate</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-zinc-950 tracking-tight">93%</div>
            <div className="text-xs text-zinc-500">
              <span className="text-emerald-600 font-semibold">+4.9%</span> vs last 4 month
            </div>
          </div>
          {/* Pastel warm sand / gray squircle */}
          <div className="w-12 h-12 rounded-2xl bg-[#EAE8E3] text-[#47453F] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Efficiency */}
        <div 
          onClick={() => onNavigateTab('batch_sweep')}
          className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-zinc-300 transition-all"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs font-medium text-zinc-600">
              <span>Efficiency</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-zinc-950 tracking-tight">+42%</div>
            <div className="text-xs text-zinc-500">
              <span className="text-emerald-600 font-semibold">+3.2%</span> vs last 4 month
            </div>
          </div>
          {/* Pastel lavender squircle */}
          <div className="w-12 h-12 rounded-2xl bg-[#E4E4EE] text-[#363559] flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3 Main Widgets Grid - exactly matching screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Widget 1: Operational Performance (Radar Chart) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 shadow-xs border border-zinc-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Operational Performance</h2>
            
            {/* Pill range switcher with cursor */}
            <div className="flex items-center p-1 rounded-xl bg-zinc-100 text-xs font-medium text-zinc-600">
              <button
                onClick={() => setTimeRange('Day')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  timeRange === 'Day' ? 'bg-white text-zinc-950 shadow-xs font-semibold' : 'hover:text-zinc-900'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setTimeRange('Week')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  timeRange === 'Week' ? 'bg-white text-zinc-950 shadow-xs font-semibold' : 'hover:text-zinc-900'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setTimeRange('6 Month')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  timeRange === '6 Month' ? 'bg-white text-zinc-950 shadow-xs font-semibold' : 'hover:text-zinc-900'
                }`}
              >
                6 Month
              </button>
            </div>
          </div>

          {/* Radar Spider Chart with 6 vertices & 3 polygon traces */}
          <div className="relative py-4 flex items-center justify-center">
            <svg viewBox="0 0 360 300" className="w-full max-w-[340px] h-[250px] overflow-visible">
              <defs>
                <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f5f5f4" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#fafaf9" stopOpacity="0.1" />
                </radialGradient>
              </defs>

              {/* Concentric Hexagons */}
              <polygon points="180,40 266,90 266,190 180,240 94,190 94,90" fill="url(#radarGlow)" stroke="#E7E5E4" strokeWidth="1" />
              <polygon points="180,70 238,105 238,175 180,210 122,175 122,105" fill="none" stroke="#E7E5E4" strokeWidth="1" strokeDasharray="3 3" />
              <polygon points="180,105 210,122 210,158 180,175 150,158 150,122" fill="none" stroke="#E7E5E4" strokeWidth="1" />

              {/* Spoke Axis Lines */}
              <line x1="180" y1="140" x2="180" y2="40" stroke="#E7E5E4" strokeWidth="1" />
              <line x1="180" y1="140" x2="266" y2="90" stroke="#E7E5E4" strokeWidth="1" />
              <line x1="180" y1="140" x2="266" y2="190" stroke="#E7E5E4" strokeWidth="1" />
              <line x1="180" y1="140" x2="180" y2="240" stroke="#E7E5E4" strokeWidth="1" />
              <line x1="180" y1="140" x2="94" y2="190" stroke="#E7E5E4" strokeWidth="1" />
              <line x1="180" y1="140" x2="94" y2="90" stroke="#E7E5E4" strokeWidth="1" />

              {/* Vertex Labels */}
              <text x="180" y="28" textAnchor="middle" className="text-[11px] fill-zinc-500 font-sans font-medium">Feb</text>
              <text x="282" y="90" textAnchor="start" className="text-[11px] fill-zinc-500 font-sans font-medium">Mar</text>
              <text x="282" y="196" textAnchor="start" className="text-[11px] fill-zinc-500 font-sans font-medium">Apr</text>
              <text x="180" y="260" textAnchor="middle" className="text-[11px] fill-zinc-500 font-sans font-medium">May</text>
              <text x="78" y="196" textAnchor="end" className="text-[11px] fill-zinc-500 font-sans font-medium">Jun</text>
              <text x="78" y="90" textAnchor="end" className="text-[11px] fill-zinc-500 font-sans font-medium">Jul</text>

              {/* Polygon 1: Process Efficiency (Golden Amber) */}
              <polygon
                points="180,68 252,120 236,172 180,224 118,170 128,105"
                fill="#F59E0B"
                fillOpacity="0.18"
                stroke="#D97706"
                strokeWidth="1.8"
              />
              <circle cx="180" cy="68" r="3.5" fill="#D97706" />
              <circle cx="252" cy="120" r="3.5" fill="#D97706" />
              <circle cx="236" cy="172" r="3.5" fill="#D97706" />
              <circle cx="180" cy="224" r="3.5" fill="#D97706" />
              <circle cx="118" cy="170" r="3.5" fill="#D97706" />
              <circle cx="128" cy="105" r="3.5" fill="#D97706" />

              {/* Polygon 2: Cost Reduction (Olive / Sage Green) */}
              <polygon
                points="180,95 230,132 198,188 180,205 142,162 152,118"
                fill="#84CC16"
                fillOpacity="0.22"
                stroke="#65A30D"
                strokeWidth="1.8"
              />
              <circle cx="180" cy="95" r="3" fill="#65A30D" />
              <circle cx="230" cy="132" r="3" fill="#65A30D" />
              <circle cx="198" cy="188" r="3" fill="#65A30D" />
              <circle cx="180" cy="205" r="3" fill="#65A30D" />
              <circle cx="142" cy="162" r="3" fill="#65A30D" />
              <circle cx="152" cy="118" r="3" fill="#65A30D" />

              {/* Polygon 3: Task Completion Speed (Soft Violet / Indigo) */}
              <polygon
                points="180,110 216,134 204,166 180,180 162,156 168,130"
                fill="#8B5CF6"
                fillOpacity="0.2"
                stroke="#7C3AED"
                strokeWidth="1.8"
              />
              <circle cx="180" cy="110" r="2.5" fill="#7C3AED" />
              <circle cx="216" cy="134" r="2.5" fill="#7C3AED" />
              <circle cx="204" cy="166" r="2.5" fill="#7C3AED" />
              <circle cx="180" cy="180" r="2.5" fill="#7C3AED" />
              <circle cx="162" cy="156" r="2.5" fill="#7C3AED" />
              <circle cx="168" cy="130" r="2.5" fill="#7C3AED" />
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-zinc-100 text-xs text-zinc-600 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
              <span>Process Efficiency</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#65A30D]" />
              <span>Cost Reduction</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
              <span>Task Completion Speed</span>
            </div>
          </div>
        </div>

        {/* Widget 2: Process Tracking (Timeline) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-xs border border-zinc-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Process Tracking</h2>
            <button className="p-1.5 text-zinc-500 hover:text-zinc-800 rounded-lg hover:bg-zinc-100">
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* Vertical Stepper Timeline - matching screenshot */}
          <div className="space-y-4 py-1">
            {[
              {
                date: '06.02.26',
                title: 'Request created',
                desc: 'Initial workflow request submitted',
                completed: true
              },
              {
                date: '07.02.26',
                title: 'Data synced',
                desc: 'All required data connected and va...',
                completed: true
              },
              {
                date: '08.02.26',
                title: 'Process started',
                desc: 'Workflow execution triggered by AI...',
                completed: true
              },
              {
                date: '09.02.26',
                title: 'In progress',
                desc: 'Tasks being executed across conn...',
                completed: true
              },
              {
                date: '10.02.26',
                title: 'Issue detected',
                desc: 'AI flagged delay in approval step',
                completed: false,
                isIssue: true
              },
              {
                date: '11.02.26',
                title: 'Completed',
                desc: 'Process finished successfully with...',
                completed: false
              }
            ].map((step, idx, arr) => (
              <div key={idx} className="flex items-start gap-3 relative">
                {/* Date pill on left */}
                <div className="px-2 py-0.5 rounded-md bg-zinc-100 text-[11px] font-mono text-zinc-600 shrink-0">
                  {step.date}
                </div>

                {/* Node & Connector */}
                <div className="relative flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full z-10 mt-1.5 ${
                    step.isIssue ? 'bg-amber-500 ring-2 ring-amber-100' :
                    step.completed ? 'bg-zinc-900' : 'bg-zinc-300'
                  }`} />
                  {idx < arr.length - 1 && (
                    <div className="w-[1.5px] bg-zinc-200 h-10 absolute top-3" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 pb-1">
                  <div className="text-xs font-bold text-zinc-900 leading-tight">{step.title}</div>
                  <div className="text-[11px] text-zinc-500 truncate max-w-[170px] mt-0.5">
                    {step.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 3: Upcoming Operations */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-xs border border-zinc-200/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Upcoming Operations</h2>
              <button className="p-1.5 text-zinc-500 hover:text-zinc-800 rounded-lg hover:bg-zinc-100">
                <CalendarIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Day Strip */}
            <div className="grid grid-cols-7 gap-1 py-2 text-center text-xs border-b border-zinc-100 mb-4">
              {[
                { day: 'Su', num: 3 },
                { day: 'Mo', num: 4 },
                { day: 'Tu', num: 5 },
                { day: 'We', num: 7 },
                { day: 'Th', num: 8, active: true },
                { day: 'Fr', num: 9 },
                { day: 'Sa', num: 10 }
              ].map((d) => (
                <div 
                  key={d.num} 
                  onClick={() => setSelectedDay(d.num)}
                  className="flex flex-col items-center gap-1 cursor-pointer"
                >
                  <span className="text-[10px] text-zinc-400 font-medium">{d.day}</span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    selectedDay === d.num
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-700 hover:bg-zinc-100'
                  }`}>
                    {d.num}
                  </div>
                </div>
              ))}
            </div>

            {/* Operation Cards */}
            <div className="space-y-2.5">
              {[
                {
                  title: 'Process Review',
                  time: '10:00 AM',
                  icon: MousePointer,
                  bg: 'bg-zinc-100 text-zinc-700'
                },
                {
                  title: 'Delivery Update',
                  time: '11:30 AM',
                  icon: Truck,
                  bg: 'bg-zinc-100 text-zinc-700'
                },
                {
                  title: 'KPI Sync',
                  time: '01:00 PM',
                  icon: BarChart,
                  bg: 'bg-zinc-100 text-zinc-700'
                },
                {
                  title: 'AI Insights',
                  time: '02:30 PM',
                  icon: Sparkles,
                  bg: 'bg-zinc-100 text-zinc-700'
                }
              ].map((op, idx) => {
                const Icon = op.icon;
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-zinc-50/80 hover:bg-zinc-100/90 border border-zinc-200/40 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${op.bg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900">{op.title}</div>
                        <div className="text-[11px] text-zinc-500 font-medium">{op.time}</div>
                      </div>
                    </div>
                    <button className="text-zinc-400 hover:text-zinc-700 p-1">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
