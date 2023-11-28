export type IntegratorPlayerInformation = {
    name: string,
    uuid: string,
    location: {
        world: string,
        x: number,
        y: number,
        z: number
    }
};
export type IntegratorServerInformation = {
    tps: number,
    players: IntegratorPlayerInformation[],
    playerCount: number
};