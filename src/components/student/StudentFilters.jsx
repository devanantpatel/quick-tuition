import React from 'react';
import { Search, Filter, Sparkles } from 'lucide-react';

export default function StudentFilters({ 
  searchQuery, 
  setSearchQuery, 
  selectedCategory, 
  setSelectedCategory,
  onlyFree,
  setOnlyFree
}) {
  const categories = ['All', 'Mathematics', 'Web Development', 'DSA'];

  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input 
            type="text" 
            placeholder="Search by topic, chapter, or subject (e.g. Calculus, React)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Free Only Toggle Button */}
        <button
          onClick={() => setOnlyFree(!onlyFree)}
          className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition ${
            onlyFree 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{onlyFree ? '✓ Showing Free Tutors (₹0)' : 'Show Only Free (₹0)'}</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
              selectedCategory === cat 
                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30' 
                : 'bg-slate-950 text-slate-400 border border-slate-800/80 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}