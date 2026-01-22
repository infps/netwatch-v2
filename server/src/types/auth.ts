export type LoginReq = { email: string; password: string }
export type LoginRes = { token: string; user: { id: string; email: string } }
export type JwtPayload = { userId: string; email: string; iat: number; exp: number }
