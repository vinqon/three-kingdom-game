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
            x: 420,
            y: 150
        }
    },
    {
        id: 'wan',
        name: '宛城',
        owner: 'wei',
        position: {
            x: 370,
            y: 285
        }
    },
    {
        id: 'xiangyang',
        name: '襄阳',
        owner: 'wei',
        position: {
            x: 500,
            y: 345
        }
    },
    {
        id: 'hefei',
        name: '合肥',
        owner: 'wei',
        position: {
            x: 720,
            y: 320
        }
    },
    {
        id: 'luoyang',
        name: '洛阳',
        owner: 'wei',
        position: {
            x: 210,
            y: 125
        }
    },
    {
        id: 'shouchun',
        name: '寿春',
        owner: 'wei',
        position: {
            x: 610,
            y: 260
        }
    },
    {
        id: 'xinye',
        name: '新野',
        owner: 'wei',
        position: {
            x: 280,
            y: 280
        }
    },
    {
        id: 'ye',
        name: '邺城',
        owner: 'wei',
        position: {
            x: 350,
            y: 45
        }
    },
    {
        id: 'chenliu',
        name: '陈留',
        owner: 'wei',
        position: {
            x: 700,
            y: 55
        }
    },
    {
        id: 'puyang',
        name: '濮阳',
        owner: 'wei',
        position: {
            x: 540,
            y: 120
        }
    },
    {
        id: 'xuzhou',
        name: '徐州',
        owner: 'wei',
        position: {
            x: 875,
            y: 130
        }
    },
    {
        id: 'chengdu',
        name: '成都',
        owner: 'shu',
        capitalOf: 'shu',
        position: {
            x: 120,
            y: 455
        }
    },
    {
        id: 'hanzhong',
        name: '汉中',
        owner: 'shu',
        position: {
            x: 200,
            y: 275
        }
    },
    {
        id: 'yongan',
        name: '永安',
        owner: 'shu',
        position: {
            x: 300,
            y: 440
        }
    },
    {
        id: 'jiangling',
        name: '江陵',
        owner: 'shu',
        position: {
            x: 395,
            y: 425
        }
    },
    {
        id: 'zitong',
        name: '梓潼',
        owner: 'shu',
        position: {
            x: 80,
            y: 350
        }
    },
    {
        id: 'jiangzhou',
        name: '江州',
        owner: 'shu',
        position: {
            x: 180,
            y: 500
        }
    },
    {
        id: 'wuling',
        name: '武陵',
        owner: 'shu',
        position: {
            x: 420,
            y: 630
        }
    },
    {
        id: 'lingling',
        name: '零陵',
        owner: 'shu',
        position: {
            x: 555,
            y: 625
        }
    },
    {
        id: 'guiyang',
        name: '桂阳',
        owner: 'shu',
        position: {
            x: 610,
            y: 520
        }
    },
    {
        id: 'jianning',
        name: '建宁',
        owner: 'shu',
        position: {
            x: 145,
            y: 630
        }
    },
    {
        id: 'yongchang',
        name: '永昌',
        owner: 'shu',
        position: {
            x: 60,
            y: 560
        }
    },
    {
        id: 'jianye',
        name: '建业',
        owner: 'wu',
        capitalOf: 'wu',
        position: {
            x: 850,
            y: 545
        }
    },
    {
        id: 'lujiang',
        name: '庐江',
        owner: 'wu',
        position: {
            x: 690,
            y: 400
        }
    },
    {
        id: 'chaisang',
        name: '柴桑',
        owner: 'wu',
        position: {
            x: 570,
            y: 390
        }
    },
    {
        id: 'changsha',
        name: '长沙',
        owner: 'wu',
        position: {
            x: 500,
            y: 500
        }
    },
    {
        id: 'wuchang',
        name: '武昌',
        owner: 'wu',
        position: {
            x: 770,
            y: 440
        }
    },
    {
        id: 'yuzhang',
        name: '豫章',
        owner: 'wu',
        position: {
            x: 760,
            y: 535
        }
    },
    {
        id: 'danyang',
        name: '丹阳',
        owner: 'wu',
        position: {
            x: 940,
            y: 220
        }
    },
    {
        id: 'wu',
        name: '吴郡',
        owner: 'wu',
        position: {
            x: 930,
            y: 300
        }
    },
    {
        id: 'kuaiji',
        name: '会稽',
        owner: 'wu',
        position: {
            x: 870,
            y: 450
        }
    },
    {
        id: 'jianan',
        name: '建安',
        owner: 'wu',
        position: {
            x: 930,
            y: 630
        }
    },
    {
        id: 'jiaozhi',
        name: '交趾',
        owner: 'wu',
        position: {
            x: 650,
            y: 610
        }
    }
];
const CITY_BY_ID = new Map(CITY_DEFINITIONS.map((city)=>[
        city.id,
        city
    ]));
const CITY_ORDERS = {
    12: {
        wei: [
            'xuchang',
            'wan',
            'xiangyang',
            'hefei'
        ],
        shu: [
            'chengdu',
            'hanzhong',
            'jiangling',
            'yongan'
        ],
        wu: [
            'jianye',
            'lujiang',
            'changsha',
            'chaisang'
        ]
    },
    21: {
        wei: [
            'xuchang',
            'luoyang',
            'wan',
            'xiangyang',
            'shouchun',
            'hefei',
            'xuzhou'
        ],
        shu: [
            'chengdu',
            'zitong',
            'hanzhong',
            'jiangling',
            'yongan',
            'wuling',
            'jiangzhou'
        ],
        wu: [
            'jianye',
            'danyang',
            'lujiang',
            'wuchang',
            'changsha',
            'chaisang',
            'yuzhang'
        ]
    },
    33: {
        wei: [
            'xuchang',
            'luoyang',
            'ye',
            'puyang',
            'chenliu',
            'xuzhou',
            'hefei',
            'shouchun',
            'xiangyang',
            'wan',
            'xinye'
        ],
        shu: [
            'chengdu',
            'zitong',
            'hanzhong',
            'jiangling',
            'yongan',
            'jiangzhou',
            'jianning',
            'yongchang',
            'wuling',
            'lingling',
            'guiyang'
        ],
        wu: [
            'jianye',
            'jianan',
            'jiaozhi',
            'changsha',
            'chaisang',
            'yuzhang',
            'wuchang',
            'lujiang',
            'danyang',
            'wu',
            'kuaiji'
        ]
    }
};
const ROUTES_BY_SIZE = {
    12: [
        [
            'xuchang',
            'wan'
        ],
        [
            'wan',
            'xiangyang'
        ],
        [
            'xiangyang',
            'hefei'
        ],
        [
            'chengdu',
            'hanzhong'
        ],
        [
            'hanzhong',
            'jiangling'
        ],
        [
            'jiangling',
            'yongan'
        ],
        [
            'jianye',
            'lujiang'
        ],
        [
            'lujiang',
            'chaisang'
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
        ]
    ],
    21: [
        [
            'luoyang',
            'xuchang'
        ],
        [
            'xuchang',
            'wan'
        ],
        [
            'wan',
            'xiangyang'
        ],
        [
            'xiangyang',
            'shouchun'
        ],
        [
            'shouchun',
            'hefei'
        ],
        [
            'hefei',
            'xuzhou'
        ],
        [
            'chengdu',
            'zitong'
        ],
        [
            'zitong',
            'hanzhong'
        ],
        [
            'hanzhong',
            'jiangling'
        ],
        [
            'jiangling',
            'yongan'
        ],
        [
            'yongan',
            'jiangzhou'
        ],
        [
            'yongan',
            'wuling'
        ],
        [
            'jianye',
            'yuzhang'
        ],
        [
            'yuzhang',
            'wuchang'
        ],
        [
            'wuchang',
            'lujiang'
        ],
        [
            'lujiang',
            'danyang'
        ],
        [
            'lujiang',
            'chaisang'
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
        ]
    ],
    33: [
        [
            'luoyang',
            'ye'
        ],
        [
            'ye',
            'xuchang'
        ],
        [
            'xuchang',
            'puyang'
        ],
        [
            'puyang',
            'chenliu'
        ],
        [
            'chenliu',
            'xuzhou'
        ],
        [
            'xuzhou',
            'hefei'
        ],
        [
            'hefei',
            'shouchun'
        ],
        [
            'shouchun',
            'xiangyang'
        ],
        [
            'xiangyang',
            'wan'
        ],
        [
            'wan',
            'xinye'
        ],
        [
            'chengdu',
            'zitong'
        ],
        [
            'zitong',
            'hanzhong'
        ],
        [
            'hanzhong',
            'jiangling'
        ],
        [
            'jiangling',
            'yongan'
        ],
        [
            'yongan',
            'jiangzhou'
        ],
        [
            'jiangzhou',
            'jianning'
        ],
        [
            'jianning',
            'yongchang'
        ],
        [
            'yongan',
            'wuling'
        ],
        [
            'wuling',
            'lingling'
        ],
        [
            'lingling',
            'guiyang'
        ],
        [
            'jianye',
            'yuzhang'
        ],
        [
            'yuzhang',
            'wuchang'
        ],
        [
            'wuchang',
            'lujiang'
        ],
        [
            'lujiang',
            'chaisang'
        ],
        [
            'chaisang',
            'changsha'
        ],
        [
            'changsha',
            'jiaozhi'
        ],
        [
            'jiaozhi',
            'jianan'
        ],
        [
            'jianan',
            'kuaiji'
        ],
        [
            'kuaiji',
            'wu'
        ],
        [
            'wu',
            'danyang'
        ],
        [
            'xinye',
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
            'guiyang',
            'changsha'
        ]
    ]
};
function routeKey([left, right]) {
    return [
        left,
        right
    ].sort().join('~');
}
export function routesForScenario(mapSize, _density = 'standard') {
    const activeIds = new Set(FACTION_ORDER.flatMap((faction)=>CITY_ORDERS[mapSize][faction]));
    const routes = [];
    const seen = new Set();
    for (const [left, right] of ROUTES_BY_SIZE[mapSize]){
        if (!activeIds.has(left) || !activeIds.has(right)) continue;
        const key = routeKey([
            left,
            right
        ]);
        if (seen.has(key)) continue;
        routes.push([
            left,
            right
        ]);
        seen.add(key);
    }
    return routes;
}
export const ROUTES = routesForScenario(12, 'standard');
function normalizeOptions(input) {
    if (typeof input === 'string') {
        return {
            playerFaction: input,
            mapSize: 12,
            routeDensity: 'standard',
            difficulty: 'easy'
        };
    }
    return input;
}
function playerStartingTroops(difficulty, isCapital) {
    if (difficulty === 'normal') return isCapital ? 4 : 2;
    if (difficulty === 'hard') return isCapital ? 3 : 1;
    return isCapital ? 5 : 3;
}
export function createLiteScenario(input) {
    const options = normalizeOptions(input);
    const activeIds = new Set(FACTION_ORDER.flatMap((faction)=>CITY_ORDERS[options.mapSize][faction]));
    const cities = {};
    for (const definition of CITY_DEFINITIONS){
        if (!activeIds.has(definition.id)) continue;
        const isCapital = Boolean(definition.capitalOf);
        const isPlayerCity = definition.owner === options.playerFaction;
        cities[definition.id] = {
            id: definition.id,
            name: definition.name,
            originalOwner: definition.owner,
            owner: definition.owner,
            troops: isPlayerCity ? playerStartingTroops(options.difficulty, isCapital) : isCapital ? 5 : 3,
            ...definition.capitalOf ? {
                capitalOf: definition.capitalOf
            } : {},
            adjacentCityIds: [],
            position: {
                ...definition.position
            }
        };
    }
    for (const [left, right] of routesForScenario(options.mapSize, options.routeDensity)){
        if (!CITY_BY_ID.has(left) || !CITY_BY_ID.has(right)) continue;
        cities[left].adjacentCityIds.push(right);
        cities[right].adjacentCityIds.push(left);
    }
    return {
        version: 2,
        round: 1,
        turnFaction: options.playerFaction,
        playerFaction: options.playerFaction,
        scenario: {
            mapSize: options.mapSize,
            routeDensity: options.routeDensity,
            difficulty: options.difficulty
        },
        actionsRemaining: 0,
        cities,
        status: 'playing',
        log: []
    };
}
