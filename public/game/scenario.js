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
            x: 404,
            y: 152
        }
    },
    {
        id: 'wan',
        name: '宛城',
        owner: 'wei',
        position: {
            x: 352,
            y: 243
        }
    },
    {
        id: 'xiangyang',
        name: '襄阳',
        owner: 'wei',
        position: {
            x: 498,
            y: 336
        }
    },
    {
        id: 'hefei',
        name: '合肥',
        owner: 'wei',
        position: {
            x: 668,
            y: 246
        }
    },
    {
        id: 'luoyang',
        name: '洛阳',
        owner: 'wei',
        position: {
            x: 217,
            y: 152
        }
    },
    {
        id: 'shouchun',
        name: '寿春',
        owner: 'wei',
        position: {
            x: 565,
            y: 252
        }
    },
    {
        id: 'xinye',
        name: '新野',
        owner: 'wei',
        position: {
            x: 225,
            y: 270
        }
    },
    {
        id: 'ye',
        name: '邺城',
        owner: 'wei',
        position: {
            x: 419,
            y: 45
        }
    },
    {
        id: 'chenliu',
        name: '陈留',
        owner: 'wei',
        position: {
            x: 617,
            y: 107
        }
    },
    {
        id: 'puyang',
        name: '濮阳',
        owner: 'wei',
        position: {
            x: 700,
            y: 49
        }
    },
    {
        id: 'xuzhou',
        name: '徐州',
        owner: 'wei',
        position: {
            x: 814,
            y: 73
        }
    },
    {
        id: 'chengdu',
        name: '成都',
        owner: 'shu',
        capitalOf: 'shu',
        position: {
            x: 206,
            y: 471
        }
    },
    {
        id: 'hanzhong',
        name: '汉中',
        owner: 'shu',
        position: {
            x: 223,
            y: 283
        }
    },
    {
        id: 'yongan',
        name: '永安',
        owner: 'shu',
        position: {
            x: 308,
            y: 479
        }
    },
    {
        id: 'jiangling',
        name: '江陵',
        owner: 'shu',
        position: {
            x: 399,
            y: 403
        }
    },
    {
        id: 'zitong',
        name: '梓潼',
        owner: 'shu',
        position: {
            x: 101,
            y: 374
        }
    },
    {
        id: 'jiangzhou',
        name: '江州',
        owner: 'shu',
        position: {
            x: 250,
            y: 540
        }
    },
    {
        id: 'wuling',
        name: '武陵',
        owner: 'shu',
        position: {
            x: 355,
            y: 606
        }
    },
    {
        id: 'lingling',
        name: '零陵',
        owner: 'shu',
        position: {
            x: 507,
            y: 592
        }
    },
    {
        id: 'guiyang',
        name: '桂阳',
        owner: 'shu',
        position: {
            x: 511,
            y: 503
        }
    },
    {
        id: 'jianning',
        name: '建宁',
        owner: 'shu',
        position: {
            x: 196,
            y: 627
        }
    },
    {
        id: 'yongchang',
        name: '永昌',
        owner: 'shu',
        position: {
            x: 86,
            y: 570
        }
    },
    {
        id: 'jianye',
        name: '建业',
        owner: 'wu',
        capitalOf: 'wu',
        position: {
            x: 894,
            y: 580
        }
    },
    {
        id: 'lujiang',
        name: '庐江',
        owner: 'wu',
        position: {
            x: 712,
            y: 260
        }
    },
    {
        id: 'chaisang',
        name: '柴桑',
        owner: 'wu',
        position: {
            x: 621,
            y: 420
        }
    },
    {
        id: 'changsha',
        name: '长沙',
        owner: 'wu',
        position: {
            x: 503,
            y: 492
        }
    },
    {
        id: 'wuchang',
        name: '武昌',
        owner: 'wu',
        position: {
            x: 760,
            y: 425
        }
    },
    {
        id: 'yuzhang',
        name: '豫章',
        owner: 'wu',
        position: {
            x: 718,
            y: 499
        }
    },
    {
        id: 'danyang',
        name: '丹阳',
        owner: 'wu',
        position: {
            x: 795,
            y: 246
        }
    },
    {
        id: 'wu',
        name: '吴郡',
        owner: 'wu',
        position: {
            x: 885,
            y: 277
        }
    },
    {
        id: 'kuaiji',
        name: '会稽',
        owner: 'wu',
        position: {
            x: 935,
            y: 398
        }
    },
    {
        id: 'jianan',
        name: '建安',
        owner: 'wu',
        position: {
            x: 807,
            y: 591
        }
    },
    {
        id: 'jiaozhi',
        name: '交趾',
        owner: 'wu',
        position: {
            x: 656,
            y: 591
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
            'xinye',
            'wan',
            'xiangyang',
            'shouchun',
            'hefei'
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
            'wuchang',
            'lujiang',
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
            'wuling',
            'lingling',
            'guiyang',
            'jiangzhou',
            'jianning',
            'yongchang'
        ],
        wu: [
            'jianye',
            'danyang',
            'wu',
            'kuaiji',
            'jianan',
            'jiaozhi',
            'changsha',
            'chaisang',
            'yuzhang',
            'wuchang',
            'lujiang'
        ]
    }
};
const SPARSE_BORDER_ROUTES = [
    [
        'wan',
        'hanzhong'
    ],
    [
        'hefei',
        'lujiang'
    ],
    [
        'jiangling',
        'changsha'
    ]
];
const STANDARD_BORDER_ROUTES = [
    [
        'xiangyang',
        'jiangling'
    ],
    [
        'xiangyang',
        'chaisang'
    ],
    [
        'yongan',
        'chaisang'
    ]
];
const DENSE_BORDER_ROUTES = [
    [
        'wan',
        'yongan'
    ],
    [
        'hefei',
        'chaisang'
    ],
    [
        'yongan',
        'changsha'
    ]
];
function routeKey([left, right]) {
    return [
        left,
        right
    ].sort().join('~');
}
function uniqueRoutes(routes) {
    const seen = new Set();
    return routes.filter((route)=>{
        const key = routeKey(route);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
export function routesForScenario(mapSize, density) {
    const routes = [];
    for (const faction of FACTION_ORDER){
        const cityIds = CITY_ORDERS[mapSize][faction];
        for(let index = 0; index < cityIds.length - 1; index += 1){
            routes.push([
                cityIds[index],
                cityIds[index + 1]
            ]);
        }
        if (density !== 'sparse') {
            routes.push([
                cityIds[0],
                cityIds[cityIds.length - 1]
            ]);
        }
        if (density === 'dense') {
            for(let index = 0; index < cityIds.length - 2; index += 1){
                routes.push([
                    cityIds[index],
                    cityIds[index + 2]
                ]);
            }
        }
    }
    routes.push(...SPARSE_BORDER_ROUTES);
    if (density !== 'sparse') routes.push(...STANDARD_BORDER_ROUTES);
    if (density === 'dense') routes.push(...DENSE_BORDER_ROUTES);
    return uniqueRoutes(routes);
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
