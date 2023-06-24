require('dotenv').config()
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core'
import { ApolloServer } from 'apollo-server-express'
import MongoStore from 'connect-mongo'
import cors from 'cors'
import express from 'express'
import session from 'express-session'
import mongoose from 'mongoose'
import { buildSchema } from 'type-graphql'
import { DataSource } from 'typeorm'
import { Context } from './@types/Context'
import { COOKIE_NAME, __pord__ } from './constants'
import { Post } from './entities/Post'
import { User } from './entities/User'
import { HelloResolver } from './resolvers/hello'
import { PostResolver } from './resolvers/post'
import { UserResolver } from './resolvers/user'
import { Upvote } from './entities/Upvote'
import { buildDataLoaders } from './utils/dataLoaders'

const AppDataSource = new DataSource({
	type: 'postgres',
	host: process.env.DB_HOST,
	port: 5432,
	username: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	entities: [User, Post, Upvote],
	synchronize: true, // auto get (find new model) model from entities update to database then not run migration
	logging: true,
})

const main = async () => {
	await AppDataSource.initialize()
		.then(async () => console.log('connet db success ...'))
		.catch((error) => console.log(error))

	const app = express()
	app.use(cors({ origin: 'http://localhost:3000', credentials: true }))

	// session/Cookie store
	const mongoUrl = `mongodb+srv://${process.env.SESSION_DB_USERNAME_DEV_PROD}:${process.env.SESSION_DB_PASSWORD_DEV_PROD}@cluster0.a98oldp.mongodb.net/?retryWrites=true&w=majority`
	await mongoose
		.connect(mongoUrl)
		.then(() => console.log('conenct mongodb success'))
		.catch((error) => console.log('connect mongodb faild', error))

	app.set('trust proxy', true)

	app.use(
		session({
			name: COOKIE_NAME,
			store: MongoStore.create({ mongoUrl }),
			cookie: {
				maxAge: 1000 * 60 * 60, // 1 hour
				httpOnly: true, // JS frontend cannot access the cookie
				secure: __pord__, // cookie only works in https
				sameSite: 'lax', // protection against CSRF
			},
			secret: process.env.SESSION_SECREST_DEV as string,
			saveUninitialized: false, // don't save empty sessions, right from the start (only store when login)
			resave: false,
		})
	)

	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [HelloResolver, UserResolver, PostResolver],
			validate: false,
		}),
		context: ({ req, res }): Context => ({
			req,
			res,
			AppDataSource,
			dataLoaders: buildDataLoaders(),
		}),
		plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
	})
	await apolloServer.start()
	apolloServer.applyMiddleware({
		app,
		cors: { origin: 'http://localhost:3000', credentials: true },
	})
	const PORT = process.env.PORT || 4000
	await new Promise((resolve) => app.listen({ port: PORT }, resolve as () => void))
	console.log(
		`SERVER STARTED ON PORT ${PORT}. GRAPQL ENDPOINT ON http://localhost:${PORT}${apolloServer.graphqlPath}`
	)
}

main().catch((error) => console.log('error', error))

// Trong đoạn mã của bạn, cấu hình saveUninitialized: false sẽ ngăn việc tạo phiên khi không có dữ liệu được thêm vào. Đồng thời, resave: false sẽ chỉ lưu trữ lại phiên khi có sự thay đổi trong phiên đó.
