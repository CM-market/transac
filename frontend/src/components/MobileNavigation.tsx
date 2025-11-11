import React, { useState } from 'react';
import { Menu, X, Home, Store, Package, User, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

interface MobileNavigationProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showBottomNav?: boolean;
  showHamburgerMenu?: boolean;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activeTab = 'overview',
  onTabChange,
  showBottomNav = true,
  showHamburgerMenu = false,
}) => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigationItems = [
    {
      id: 'overview',
      label: t('overview', 'Overview'),
      icon: Home,
      color: 'text-emerald-600',
    },
    {
      id: 'stores',
      label: t('stores', 'Stores'),
      icon: Store,
      color: 'text-blue-600',
    },
    {
      id: 'products',
      label: t('products', 'Products'),
      icon: Package,
      color: 'text-purple-600',
    },
    {
      id: 'profile',
      label: t('profile', 'Profile'),
      icon: User,
      color: 'text-orange-600',
    },
  ];

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
    setIsMenuOpen(false);
  };

  // Hamburger Menu Component
  const HamburgerMenu = () => (
    <>
      {/* Menu Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-target md:hidden"
        aria-label="Toggle menu"
      >
        {isMenuOpen ? (
          <X className="w-6 h-6 text-gray-600" />
        ) : (
          <Menu className="w-6 h-6 text-gray-600" />
        )}
      </button>

      {/* Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Slide-out Menu */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-900">
              {t('navigation', 'Navigation')}
            </h2>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-target"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors touch-target ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Settings & Language */}
          <div className="mt-8 pt-8 border-t border-gray-200 space-y-2">
            <div className="px-4 py-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                {t('settings', 'Settings')}
              </p>
              <LanguageSwitcher showLabel={true} />
            </div>
            <button
              onClick={() => handleTabClick('settings')}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors touch-target"
            >
              <Settings className="w-5 h-5 text-gray-400" />
              <span className="font-medium">{t('settings', 'Settings')}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Bottom Navigation Component
  const BottomNavigation = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden">
      <div className="flex justify-around items-center py-2 pb-safe-bottom">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors touch-target ${
                isActive ? 'text-emerald-600' : 'text-gray-500'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {showHamburgerMenu && <HamburgerMenu />}
      {showBottomNav && <BottomNavigation />}
    </>
  );
};

export default MobileNavigation;
