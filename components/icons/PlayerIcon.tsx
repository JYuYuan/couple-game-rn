import React from 'react';
import {AirplaneIcon} from './AirplaneIcon';
import {HelicopterIcon} from './HelicopterIcon';
import {RocketIcon} from './RocketIcon';
import {UFOIcon} from './UFOIcon';

export type PlayerIconType = 'airplane' | 'helicopter' | 'rocket' | 'ufo';

interface PlayerIconProps {
  type: PlayerIconType;
  size?: number;
  color?: string;
}

export const PlayerIcon: React.FC<PlayerIconProps> = ({
  type,
  size = 24,
  color
}) => {
  switch (type) {
    case 'airplane':
      return <AirplaneIcon size={size} color={color} />;
    case 'helicopter':
      return <HelicopterIcon size={size} color={color} />;
    case 'rocket':
      return <RocketIcon size={size} color={color} />;
    case 'ufo':
      return <UFOIcon size={size} color={color} />;
    default:
      return <AirplaneIcon size={size} color={color} />;
  }
};

// 导出所有图标类型
export { AirplaneIcon, HelicopterIcon, RocketIcon, UFOIcon };