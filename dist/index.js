"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const apollo_server_core_1 = require("apollo-server-core");
const apollo_server_express_1 = require("apollo-server-express");
const connect_mongo_1 = __importDefault(require("connect-mongo"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const mongoose_1 = __importDefault(require("mongoose"));
const type_graphql_1 = require("type-graphql");
const typeorm_1 = require("typeorm");
const constants_1 = require("./constants");
const Post_1 = require("./entities/Post");
const User_1 = require("./entities/User");
const hello_1 = require("./resolvers/hello");
const post_1 = require("./resolvers/post");
const user_1 = require("./resolvers/user");
const Upvote_1 = require("./entities/Upvote");
const dataLoaders_1 = require("./utils/dataLoaders");
const AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [User_1.User, Post_1.Post, Upvote_1.Upvote],
    synchronize: true,
    logging: true,
});
const main = async () => {
    await AppDataSource.initialize()
        .then(async () => console.log('connet db success ...'))
        .catch((error) => console.log(error));
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({ origin: 'https://client-reddit-ten.vercel.app', credentials: true }));
    const mongoUrl = `mongodb+srv://${process.env.SESSION_DB_USERNAME_DEV_PROD}:${process.env.SESSION_DB_PASSWORD_DEV_PROD}@cluster0.a98oldp.mongodb.net/?retryWrites=true&w=majority`;
    await mongoose_1.default
        .connect(mongoUrl)
        .then(() => console.log('conenct mongodb success'))
        .catch((error) => console.log('connect mongodb faild', error));
    app.set('trust proxy', true);
    app.use((0, express_session_1.default)({
        name: constants_1.COOKIE_NAME,
        store: connect_mongo_1.default.create({ mongoUrl }),
        cookie: {
            maxAge: 1000 * 60 * 60,
            httpOnly: true,
            secure: constants_1.__pord__,
            sameSite: 'none',
            domain: 'https://client-reddit-ten.vercel.app',
        },
        secret: process.env.SESSION_SECREST_DEV,
        saveUninitialized: false,
        resave: false,
    }));
    const apolloServer = new apollo_server_express_1.ApolloServer({
        schema: await (0, type_graphql_1.buildSchema)({
            resolvers: [hello_1.HelloResolver, user_1.UserResolver, post_1.PostResolver],
            validate: false,
        }),
        context: ({ req, res }) => ({
            req,
            res,
            AppDataSource,
            dataLoaders: (0, dataLoaders_1.buildDataLoaders)(),
        }),
        plugins: [(0, apollo_server_core_1.ApolloServerPluginLandingPageGraphQLPlayground)()],
    });
    await apolloServer.start();
    apolloServer.applyMiddleware({
        app,
        cors: { origin: 'https://client-reddit-ten.vercel.app', credentials: true },
    });
    const PORT = process.env.PORT || 4000;
    await new Promise((resolve) => app.listen({ port: PORT }, resolve));
    console.log(`SERVER STARTED ON PORT ${PORT}. GRAPQL ENDPOINT ON http://localhost:${PORT}${apolloServer.graphqlPath}`);
};
main().catch((error) => console.log('error', error));
//# sourceMappingURL=index.js.map