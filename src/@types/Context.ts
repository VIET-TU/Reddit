import { Session, SessionData } from 'express-session'
import { Request, Response } from 'express'
import { DataSource } from 'typeorm'
import { buildDataLoaders } from '../utils/dataLoaders'

export type Context = {
	req: Request & { session: Session & Partial<SessionData> & { userId?: number } }
	res: Response
	AppDataSource: DataSource
	dataLoaders: ReturnType<typeof buildDataLoaders>
}
