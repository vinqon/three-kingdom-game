import type { CityState, FactionId, GameState } from './types.ts';

export interface CityDefinition {
  id: string;
  name: string;
  owner: FactionId;
  capitalOf?: FactionId;
  position: { x: number; y: number };
}

export type ScenarioCityCount = 12 | 18 | 24;
export type ScenarioDifficulty = 'easy' | 'medium' | 'hard';

interface ScenarioDefinition {
  cityDefinitions: CityDefinition[];
  routes: [string, string][];
}

export const FACTION_ORDER: FactionId[] = ['wei', 'shu', 'wu'];

export const CITY_DEFINITIONS: CityDefinition[] = [
  { id: 'xuchang', name: '许昌', owner: 'wei', capitalOf: 'wei', position: { x: 190, y: 90 } },
  { id: 'wan', name: '宛城', owner: 'wei', position: { x: 315, y: 205 } },
  { id: 'xiangyang', name: '襄阳', owner: 'wei', position: { x: 455, y: 315 } },
  { id: 'hefei', name: '合肥', owner: 'wei', position: { x: 575, y: 160 } },

  { id: 'chengdu', name: '成都', owner: 'shu', capitalOf: 'shu', position: { x: 115, y: 585 } },
  { id: 'hanzhong', name: '汉中', owner: 'shu', position: { x: 245, y: 415 } },
  { id: 'yongan', name: '永安', owner: 'shu', position: { x: 335, y: 575 } },
  { id: 'jiangling', name: '江陵', owner: 'shu', position: { x: 475, y: 455 } },

  { id: 'jianye', name: '建业', owner: 'wu', capitalOf: 'wu', position: { x: 890, y: 575 } },
  { id: 'lujiang', name: '庐江', owner: 'wu', position: { x: 750, y: 245 } },
  { id: 'chaisang', name: '柴桑', owner: 'wu', position: { x: 710, y: 445 } },
  { id: 'changsha', name: '长沙', owner: 'wu', position: { x: 600, y: 570 } },
];

export const ROUTES: [string, string][] = [
  ['xuchang', 'wan'],
  ['xuchang', 'hefei'],
  ['wan', 'xiangyang'],
  ['hefei', 'xiangyang'],

  ['chengdu', 'hanzhong'],
  ['chengdu', 'yongan'],
  ['hanzhong', 'jiangling'],
  ['yongan', 'jiangling'],

  ['jianye', 'lujiang'],
  ['jianye', 'chaisang'],
  ['lujiang', 'changsha'],
  ['chaisang', 'changsha'],

  ['wan', 'hanzhong'],
  ['xiangyang', 'jiangling'],
  ['hefei', 'lujiang'],
  ['xiangyang', 'chaisang'],
  ['yongan', 'chaisang'],
  ['jiangling', 'changsha'],
];

const CITY_DEFINITIONS_18: CityDefinition[] = [
  { id: 'xuchang', name: '许昌', owner: 'wei', capitalOf: 'wei', position: { x: 190, y: 90 } },
  { id: 'ye', name: '邺城', owner: 'wei', position: { x: 310, y: 80 } },
  { id: 'luoyang', name: '洛阳', owner: 'wei', position: { x: 145, y: 215 } },
  { id: 'wan', name: '宛城', owner: 'wei', position: { x: 315, y: 205 } },
  { id: 'xiangyang', name: '襄阳', owner: 'wei', position: { x: 455, y: 315 } },
  { id: 'hefei', name: '合肥', owner: 'wei', position: { x: 575, y: 160 } },

  { id: 'chengdu', name: '成都', owner: 'shu', capitalOf: 'shu', position: { x: 115, y: 585 } },
  { id: 'zitong', name: '梓潼', owner: 'shu', position: { x: 125, y: 455 } },
  { id: 'hanzhong', name: '汉中', owner: 'shu', position: { x: 245, y: 415 } },
  { id: 'ba', name: '巴郡', owner: 'shu', position: { x: 245, y: 540 } },
  { id: 'yongan', name: '永安', owner: 'shu', position: { x: 335, y: 575 } },
  { id: 'jiangling', name: '江陵', owner: 'shu', position: { x: 475, y: 455 } },

  { id: 'jianye', name: '建业', owner: 'wu', capitalOf: 'wu', position: { x: 890, y: 575 } },
  { id: 'guangling', name: '广陵', owner: 'wu', position: { x: 860, y: 260 } },
  { id: 'lujiang', name: '庐江', owner: 'wu', position: { x: 750, y: 245 } },
  { id: 'chaisang', name: '柴桑', owner: 'wu', position: { x: 710, y: 445 } },
  { id: 'changsha', name: '长沙', owner: 'wu', position: { x: 600, y: 570 } },
  { id: 'wujun', name: '吴郡', owner: 'wu', position: { x: 910, y: 425 } },
];

const ROUTES_18: [string, string][] = [
  ['xuchang', 'ye'],
  ['xuchang', 'luoyang'],
  ['ye', 'wan'],
  ['luoyang', 'wan'],
  ['wan', 'xiangyang'],
  ['ye', 'hefei'],
  ['hefei', 'xiangyang'],

  ['chengdu', 'zitong'],
  ['zitong', 'hanzhong'],
  ['hanzhong', 'ba'],
  ['chengdu', 'ba'],
  ['ba', 'yongan'],
  ['hanzhong', 'jiangling'],
  ['yongan', 'jiangling'],

  ['guangling', 'lujiang'],
  ['guangling', 'wujun'],
  ['lujiang', 'chaisang'],
  ['chaisang', 'changsha'],
  ['chaisang', 'wujun'],
  ['wujun', 'jianye'],

  ['wan', 'hanzhong'],
  ['xiangyang', 'jiangling'],
  ['hefei', 'lujiang'],
  ['xiangyang', 'chaisang'],
  ['yongan', 'changsha'],
  ['jiangling', 'changsha'],
];

const CITY_DEFINITIONS_24: CityDefinition[] = [
  { id: 'xuchang', name: '许昌', owner: 'wei', capitalOf: 'wei', position: { x: 190, y: 90 } },
  { id: 'ye', name: '邺城', owner: 'wei', position: { x: 310, y: 80 } },
  { id: 'luoyang', name: '洛阳', owner: 'wei', position: { x: 145, y: 215 } },
  { id: 'wan', name: '宛城', owner: 'wei', position: { x: 315, y: 205 } },
  { id: 'runan', name: '汝南', owner: 'wei', position: { x: 420, y: 145 } },
  { id: 'xiangyang', name: '襄阳', owner: 'wei', position: { x: 455, y: 315 } },
  { id: 'hefei', name: '合肥', owner: 'wei', position: { x: 575, y: 160 } },
  { id: 'shouchun', name: '寿春', owner: 'wei', position: { x: 620, y: 285 } },

  { id: 'chengdu', name: '成都', owner: 'shu', capitalOf: 'shu', position: { x: 115, y: 585 } },
  { id: 'guanghan', name: '广汉', owner: 'shu', position: { x: 185, y: 630 } },
  { id: 'zitong', name: '梓潼', owner: 'shu', position: { x: 125, y: 455 } },
  { id: 'hanzhong', name: '汉中', owner: 'shu', position: { x: 245, y: 415 } },
  { id: 'ba', name: '巴郡', owner: 'shu', position: { x: 245, y: 540 } },
  { id: 'yongan', name: '永安', owner: 'shu', position: { x: 335, y: 575 } },
  { id: 'jiangling', name: '江陵', owner: 'shu', position: { x: 475, y: 455 } },
  { id: 'wuling', name: '武陵', owner: 'shu', position: { x: 455, y: 600 } },

  { id: 'jianye', name: '建业', owner: 'wu', capitalOf: 'wu', position: { x: 860, y: 535 } },
  { id: 'guangling', name: '广陵', owner: 'wu', position: { x: 860, y: 260 } },
  { id: 'lujiang', name: '庐江', owner: 'wu', position: { x: 750, y: 245 } },
  { id: 'chaisang', name: '柴桑', owner: 'wu', position: { x: 710, y: 445 } },
  { id: 'changsha', name: '长沙', owner: 'wu', position: { x: 600, y: 570 } },
  { id: 'yuzhang', name: '豫章', owner: 'wu', position: { x: 760, y: 585 } },
  { id: 'wujun', name: '吴郡', owner: 'wu', position: { x: 910, y: 425 } },
  { id: 'kuaiji', name: '会稽', owner: 'wu', position: { x: 925, y: 610 } },
];

const ROUTES_24: [string, string][] = [
  ['xuchang', 'ye'],
  ['ye', 'runan'],
  ['runan', 'hefei'],
  ['xuchang', 'luoyang'],
  ['ye', 'wan'],
  ['luoyang', 'wan'],
  ['wan', 'xiangyang'],
  ['hefei', 'shouchun'],
  ['shouchun', 'xiangyang'],

  ['chengdu', 'guanghan'],
  ['guanghan', 'ba'],
  ['hanzhong', 'ba'],
  ['ba', 'yongan'],
  ['chengdu', 'zitong'],
  ['zitong', 'hanzhong'],
  ['hanzhong', 'jiangling'],
  ['yongan', 'jiangling'],
  ['yongan', 'wuling'],

  ['guangling', 'lujiang'],
  ['guangling', 'wujun'],
  ['lujiang', 'chaisang'],
  ['chaisang', 'changsha'],
  ['changsha', 'yuzhang'],
  ['yuzhang', 'kuaiji'],
  ['kuaiji', 'wujun'],
  ['wujun', 'jianye'],
  ['jianye', 'yuzhang'],

  ['wan', 'hanzhong'],
  ['xiangyang', 'jiangling'],
  ['xiangyang', 'chaisang'],
  ['hefei', 'lujiang'],
  ['shouchun', 'lujiang'],
  ['wuling', 'changsha'],
  ['jiangling', 'chaisang'],
];

const SCENARIOS: Record<ScenarioCityCount, ScenarioDefinition> = {
  12: { cityDefinitions: CITY_DEFINITIONS, routes: ROUTES },
  18: { cityDefinitions: CITY_DEFINITIONS_18, routes: ROUTES_18 },
  24: { cityDefinitions: CITY_DEFINITIONS_24, routes: ROUTES_24 },
};

function initialTroops(definition: CityDefinition, playerFaction: FactionId, difficulty: ScenarioDifficulty): number {
  if (difficulty === 'medium') return definition.owner === playerFaction ? 3 : 4;
  if (difficulty === 'hard' && definition.owner === playerFaction) {
    return definition.capitalOf ? 3 : 1;
  }
  return definition.capitalOf ? 5 : 3;
}

export function createLiteScenario(
  playerFaction: FactionId,
  cityCount: ScenarioCityCount = 12,
  difficulty: ScenarioDifficulty = 'easy',
): GameState {
  const scenario = SCENARIOS[cityCount] ?? SCENARIOS[12];
  const cities: Record<string, CityState> = {};

  for (const definition of scenario.cityDefinitions) {
    cities[definition.id] = {
      id: definition.id,
      name: definition.name,
      originalOwner: definition.owner,
      owner: definition.owner,
      troops: initialTroops(definition, playerFaction, difficulty),
      ...(definition.capitalOf ? { capitalOf: definition.capitalOf } : {}),
      adjacentCityIds: [],
      position: { ...definition.position },
    };
  }

  for (const [left, right] of scenario.routes) {
    cities[left].adjacentCityIds.push(right);
    cities[right].adjacentCityIds.push(left);
  }

  return {
    version: 2,
    round: 1,
    turnFaction: playerFaction,
    playerFaction,
    actionsRemaining: 0,
    cities,
    status: 'playing',
    log: [],
  };
}
