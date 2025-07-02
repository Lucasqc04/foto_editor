import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface ConversionTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ConversionTabs: React.FC<ConversionTabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="mb-6 md:mb-8">
      {/* Desktop tabs */}
      <div className="hidden md:flex flex-wrap gap-2 p-2 bg-gray-100 rounded-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 lg:px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-md scale-105'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-white/50'
              }`}
            >
              <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
              <span className="whitespace-nowrap text-sm lg:text-base">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile dropdown */}
      <div className="md:hidden">
        <select
          value={activeTab}
          onChange={(e) => onTabChange(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ConversionTabs;