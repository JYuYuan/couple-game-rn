export interface PathCell {
    id: number;
    x: number;
    y: number;
    type: 'start' | 'end' | 'star' | 'trap' | 'path';
    direction: 'right' | 'down' | 'left' | 'up' | null;
}

export interface Player {
    id: number;
    name: string;
    color: string;
    position: number;
    score: number;
    iconType?: string; // 添加图标类型，可选以保持向后兼容
    isAI?: boolean;
}

export interface GameState {
    status: 'idle' | 'playing' | 'paused' | 'ended';
    mode: 'single' | 'multi';
    currentPlayer: number;
    players: Player[];
    board: PathCell[];
    diceValue: number;
    round: number;
    timeLeft: number;
}