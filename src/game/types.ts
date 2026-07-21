export type FactionId = 'wei' | 'shu' | 'wu';

export type GameStatus = 'playing' | 'victory' | 'defeat';

export type ActionMode = 'transfer' | 'attack';

export type PlaybackPhase = 'announce' | 'move' | 'resolve';

export type PlaybackOutcome = 'transferred' | 'captured' | 'held';

export interface CityState {
  id: string;
  name: string;
  originalOwner: FactionId;
  owner: FactionId;
  troops: number;
  capitalOf?: FactionId;
  adjacentCityIds: string[];
  position: {
    x: number;
    y: number;
  };
}

export interface GameLogEntry {
  id: string;
  message: string;
  faction: FactionId;
  type: 'reinforce' | 'transfer' | 'attack' | 'system';
}

export interface GameState {
  version: 2;
  round: number;
  turnFaction: FactionId;
  playerFaction: FactionId;
  actionsRemaining: number;
  cities: Record<string, CityState>;
  status: GameStatus;
  winner?: FactionId;
  log: GameLogEntry[];
}

export interface MoveCommand {
  originCityId: string;
  targetCityId: string;
  troops: number;
}

export interface ActionPlayback {
  faction: FactionId;
  mode: ActionMode;
  command: MoveCommand;
  phase: PlaybackPhase;
  originName: string;
  targetName: string;
  beforeTargetOwner: FactionId;
  afterTargetOwner: FactionId;
  beforeTargetTroops: number;
  afterTargetTroops: number;
  outcome: PlaybackOutcome;
}

export interface ActionResult {
  state: GameState;
  message: string;
}

export class GameRuleError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'GameRuleError';
    this.code = code;
  }
}
