import React from 'react';
import { Camera, Sparkles } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-xl">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">ImagePro</h1>
              <p className="text-sm text-gray-500">Conversor Online</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full font-medium">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm">100% Grátis</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;