export type UserRole = 'user' | 'admin'
export type LoginReq = { email: string; password: string }
export type LoginRes = { token: string; user: { id: string; email: string; role: UserRole } }
export type JwtPayload = { userId: string; email: string; role: UserRole; iat: number; exp: number }
