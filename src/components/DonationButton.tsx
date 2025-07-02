import React, { useState } from 'react';
import { Heart, X, Coffee, Gift } from 'lucide-react';

interface DonationButtonProps {
  onClose: () => void;
}

const DonationButton: React.FC<DonationButtonProps> = ({ onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDonate = (amount: number) => {
    // Simulate PayPal donation link
    const paypalUrl = `https://www.paypal.com/donate/?hosted_button_id=YOUR_BUTTON_ID&amount=${amount}&currency_code=BRL`;
    window.open(paypalUrl, '_blank');
  };

  return (
    <div className="relative">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
        >
          <Heart className="h-6 w-6" />
          <span className="font-medium">Gostou?</span>
        </button>
      ) : (
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm border-2 border-pink-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-pink-500 to-red-500 p-2 rounded-full">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-800">Te ajudamos?</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-2">
                Ajude-nos a manter este site gratuito e sem anúncios!
              </p>
              <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                <Coffee className="h-4 w-4" />
                <span>Compre-nos um café ☕</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { amount: 5, label: 'R$ 5', icon: '☕' },
                { amount: 10, label: 'R$ 10', icon: '🍕' },
                { amount: 25, label: 'R$ 25', icon: '🎉' },
                { amount: 50, label: 'R$ 50', icon: '🚀' },
              ].map((option) => (
                <button
                  key={option.amount}
                  onClick={() => handleDonate(option.amount)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-sm flex items-center justify-center gap-1"
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => handleDonate(0)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center gap-1 mx-auto"
              >
                <Gift className="h-4 w-4" />
                Outro valor
              </button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              <p>💫 Seguro via PayPal</p>
              <p>🔒 Sem compromisso</p>
              <p>❤️ Muito obrigado!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationButton;