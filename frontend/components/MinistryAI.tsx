import React, { useState } from 'react';
import { generateMinistryInsights } from '../services/geminiService';
import { Sparkles, Loader2, X } from 'lucide-react';

interface MinistryAIProps {
  onClose: () => void;
}

const MinistryAI: React.FC<MinistryAIProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    const result = await generateMinistryInsights();
    setInsight(result);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-ministry-card w-full max-w-2xl rounded-3xl border border-ministry-neon/50 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-ministry-neon to-ministry-orange p-2 rounded-xl">
               <Sparkles className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ministry-text">Ministry AI Insights</h2>
              <p className="text-sm text-gray-500">Powered by Gemini 3 Flash</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
          {!insight && !loading && (
            <div className="text-center py-10">
              <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-ministry-text mb-2">Ready to analyze</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                Generate an executive summary of your current dashboard metrics, identifying trends in giving, attendance, and soul winning.
              </p>
              <button 
                onClick={handleGenerate}
                className="bg-ministry-neon text-black font-bold py-3 px-8 rounded-full hover:bg-white hover:border hover:border-ministry-neon hover:scale-105 transition-all duration-200 shadow-md"
              >
                Generate Report
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-ministry-orange animate-spin mb-4" />
              <p className="text-gray-500 animate-pulse">Analyzing ministry data...</p>
            </div>
          )}

          {insight && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="prose prose-invert max-w-none">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-gray-800 whitespace-pre-line leading-relaxed">
                  {insight}
                </div>
              </div>
              <div className="flex justify-end pt-4">
                 <button 
                   onClick={handleGenerate}
                   className="text-ministry-orange hover:text-orange-700 text-sm font-medium flex items-center"
                 >
                   <Sparkles className="w-4 h-4 mr-2" />
                   Regenerate Analysis
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MinistryAI;