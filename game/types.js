export class GameRuleError extends Error {
    code;
    constructor(code){
        super(code);
        this.name = 'GameRuleError';
        this.code = code;
    }
}
