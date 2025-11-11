import React from 'react';
import { useTranslation } from 'react-i18next';
import MobileNavigation from './MobileNavigation';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showBottomNav?: boolean;
  showHamburgerMenu?: boolean;
  headerActions?: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  showBackButton = false,
  onBack,
  activeTab,
  onTabChange,
  showBottomNav = false,
  showHamburgerMenu = false,
  headerActions,
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-bottom">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6">
          {/* Left side */}
          <div className="flex items-center space-x-3">
            {showHamburgerMenu && (
              <MobileNavigation
                activeTab={activeTab}
                onTabChange={onTabChange}
                showBottomNav={false}
                showHamburgerMenu={true}
              />
            )}
            
            {showBackButton && onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-target"
                aria-label="Go back"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            
            {title && (
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {title}
              </h1>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-2">
            {headerActions}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`${showBottomNav ? 'pb-20' : 'pb-4'}`}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <MobileNavigation
          activeTab={activeTab}
          onTabChange={onTabChange}
          showBottomNav={true}
          showHamburgerMenu={false}
        />
      )}
    </div>
  );
};

export default MobileLayout;
