import React from 'react';

export interface SearchResultItem {
  id: string;
  name: string;
  description?: string;
  icon?: {
    type: 'emoji' | 'text' | 'image';
    value: string;
    color?: string;
  };
  type: 'command' | 'chat' | 'app' | 'link';
  action?: () => void;
}

interface SearchResultProps {
  item: SearchResultItem;
  isActive: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

export function SearchResult({ item, isActive, onClick, onMouseEnter }: SearchResultProps) {
  const renderIcon = () => {
    if (!item.icon) {
      // Default icons based on type
      const defaultIcons = {
        command: '⌘',
        chat: '💬',
        app: '📱',
        link: '🔗',
      };
      return (
        <div className="result-icon result-icon-default">
          {defaultIcons[item.type]}
        </div>
      );
    }

    switch (item.icon.type) {
      case 'emoji':
        return <div className="result-icon result-icon-emoji">{item.icon.value}</div>;
      case 'text':
        return (
          <div
            className="result-icon result-icon-text"
            style={{ backgroundColor: item.icon.color || '#6366f1' }}
          >
            {item.icon.value}
          </div>
        );
      case 'image':
        return <img className="result-icon result-icon-image" src={item.icon.value} alt="" />;
      default:
        return <div className="result-icon result-icon-default">•</div>;
    }
  };

  return (
    <div
      className={`search-result ${isActive ? 'active' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {renderIcon()}
      <div className="result-content">
        <div className="result-name">{item.name}</div>
        {item.description && <div className="result-description">{item.description}</div>}
      </div>
      <div className="result-action">
        {isActive && (
          <div className="result-enter">
            <span className="key">↵</span>
          </div>
        )}
      </div>
    </div>
  );
}
