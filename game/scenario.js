export const FACTION_ORDER = [
    'wei',
    'shu',
    'wu'
];
export const CITY_DEFINITIONS = [
    {
        id: 'xuchang',
        name: '许昌',
        owner: 'wei',
        capitalOf: 'wei',
        position: {
            x: 190,
            y: 90
        }
    },
    {
        id: 'wan',
        name: '宛城',
        owner: 'wei',
        position: {
            x: 315,
            y: 205
        }
    },
    {
        id: 'xiangyang',
        name: '襄阳',
        owner: 'wei',
        position: {
            x: 455,
            y: 315
        }
    },
    {
        id: 'hefei',
        name: '合肥',
        owner: 'wei',
        position: {
            x: 575,
            y: 160
        }
    },
    {
        id: 'chengdu',
        name: '成都',
        owner: 'shu',
        capitalOf: 'shu',
        position: {
            x: 115,
            y: 585
        }
    },
    {
        id: 'hanzhong',
        name: '汉中',
        owner: 'shu',
        position: {
            x: 245,
            y: 415
        }
    },
    {
        id: 'yongan',
        name: '永安',
        owner: 'shu',
        position: {
            x: 335,
            y: 575
        }
    },
    {
        id: 'jiangling',
        name: '江陵',
        owner: 'shu',
        position: {
            x: 475,
            y: 455
        }
    },
    {
        id: 'jianye',
        name: '建业',
        owner: 'wu',
        capitalOf: 'wu',
        position: {
            x: 890,
            y: 575
        }
    },
    {
        id: 'lujiang',
        name: '庐江',
        owner: 'wu',
        position: {
            x: 750,
            y: 245
        }
    },
    {
        id: 'chaisang',
        name: '柴桑',
        owner: 'wu',
        position: {
            x: 710,
            y: 445
        }
    },
    {
        id: 'changsha',
        name: '长沙',
        owner: 'wu',
        position: {
            x: 600,
            y: 570
        }
    }
];
export const ROUTES = [
    [
        'xuchang',
        'wan'
    ],
    [
        'xuchang',
        'hefei'
    ],
    [
        'wan',
        'xiangyang'
    ],
    [
        'hefei',
        'xiangyang'
    ],
    [
        'chengdu',
        'hanzhong'
    ],
    [
        'chengdu',
        'yongan'
    ],
    [
        'hanzhong',
        'jiangling'
    ],
    [
        'yongan',
        'jiangling'
    ],
    [
        'jianye',
        'lujiang'
    ],
    [
        'jianye',
        'chaisang'
    ],
    [
        'lujiang',
        'changsha'
    ],
    [
        'chaisang',
        'changsha'
    ],
    [
        'wan',
        'hanzhong'
    ],
    [
        'xiangyang',
        'jiangling'
    ],
    [
        'hefei',
        'lujiang'
    ],
    [
        'xiangyang',
        'chaisang'
    ],
    [
        'yongan',
        'chaisang'
    ],
    [
        'jiangling',
        'changsha'
    ]
];
export function createLiteScenario(playerFaction) {
    const cities = {};
    for (const definition of CITY_DEFINITIONS){
        cities[definition.id] = {
            id: definition.id,
            name: definition.name,
            originalOwner: definition.owner,
            owner: definition.owner,
            troops: definition.capitalOf ? 5 : 3,
            ...definition.capitalOf ? {
                capitalOf: definition.capitalOf
            } : {},
            adjacentCityIds: [],
            position: {
                ...definition.position
            }
        };
    }
    for (const [left, right] of ROUTES){
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
        log: []
    };
}
