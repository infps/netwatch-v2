export type PunchType = 'in' | 'out' | 'break_start' | 'break_end'
export type PunchReq = { type: PunchType }
export type PunchRecord = { id: string; userId: string; type: PunchType; timestamp: number }
