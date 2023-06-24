"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostResolver = void 0;
const VoteType_1 = require("./../@types/VoteType");
const type_graphql_1 = require("type-graphql");
const CreatePostInput_1 = require("../@types/CreatePostInput ");
const PaginatedPosts_1 = require("../@types/PaginatedPosts");
const PostMutationResponse_1 = require("../@types/PostMutationResponse");
const UpdatePostInput_1 = require("../@types/UpdatePostInput");
const Post_1 = require("../entities/Post");
const User_1 = require("../entities/User");
const checkAuth_1 = require("../middleware/checkAuth");
const typeorm_1 = require("typeorm");
const apollo_server_core_1 = require("apollo-server-core");
const Upvote_1 = require("../entities/Upvote");
(0, type_graphql_1.registerEnumType)(VoteType_1.VoteType, {
    name: 'VoteType',
});
let PostResolver = exports.PostResolver = class PostResolver {
    textSnippet(root) {
        return root.text.slice(0, 50);
    }
    async user(root, { dataLoaders: { userLoader } }) {
        return await userLoader.load(root.userId);
    }
    async voteType(root, { req, dataLoaders: { voteTypeLoader } }) {
        if (!req.session.userId)
            return 0;
        const existingVote = await voteTypeLoader.load({ userId: req.session.userId, postId: root.id });
        return existingVote ? existingVote.value : 0;
    }
    async createPost({ title, text }, { req }) {
        try {
            const newPost = Post_1.Post.create({
                title,
                text,
                userId: req.session.userId,
            });
            await newPost.save();
            return {
                code: 200,
                success: true,
                message: 'Post created successfully',
                post: newPost,
            };
        }
        catch (error) {
            console.log(error);
            return {
                code: 500,
                success: false,
                message: `Internal server error >> ${error.message}`,
            };
        }
    }
    async posts(limit, cursor) {
        try {
            const totalPostCount = await Post_1.Post.count();
            const realLimit = Math.min(10, limit);
            const findOptions = {
                order: {
                    createdAt: 'DESC',
                },
                take: realLimit,
            };
            let lastPost = [];
            if (cursor) {
                findOptions.where = {
                    createdAt: (0, typeorm_1.LessThan)(cursor),
                };
                lastPost = await Post_1.Post.find({ order: { createdAt: 'ASC' }, take: 1 });
            }
            console.log('findOptions :>> ', cursor);
            const posts = await Post_1.Post.find(findOptions);
            return {
                totalCount: totalPostCount,
                cursor: posts[posts.length - 1].createdAt,
                hasMore: cursor
                    ? posts[posts.length - 1].createdAt.toString() !== lastPost[0].createdAt.toString()
                    : posts.length !== totalPostCount,
                paginatedPosts: posts,
            };
        }
        catch (error) {
            console.log(error);
            return null;
        }
    }
    async post(id) {
        try {
            return await Post_1.Post.findOneBy({ id: id });
        }
        catch (error) {
            console.log(error);
            return null;
        }
    }
    async updatePost({ id, title, text }, { req }) {
        try {
            const existingPost = await Post_1.Post.findOneBy({ id });
            if (!existingPost)
                return {
                    code: 400,
                    success: false,
                    message: 'Post not found',
                };
            if (existingPost.userId !== req.session.userId) {
                return { code: 401, success: false, message: 'Unauthorised' };
            }
            existingPost.title = title;
            existingPost.text = text;
            await existingPost.save();
            return {
                code: 200,
                success: true,
                message: 'Post updated successfully',
                post: existingPost,
            };
        }
        catch (error) {
            console.log(error);
            return {
                code: 500,
                success: false,
                message: `Internal server error >> ${error.message}`,
            };
        }
    }
    async deletePost(id, { req }) {
        try {
            const exitingPost = await Post_1.Post.findOneBy({ id });
            if (!exitingPost)
                return {
                    code: 400,
                    success: false,
                    message: 'Post not found',
                };
            if (exitingPost.userId !== req.session.userId) {
                return {
                    code: 401,
                    success: false,
                    message: 'Unauthorzed',
                };
            }
            await Post_1.Post.delete({ id });
            return {
                code: 200,
                success: true,
                message: 'Post deleted successfully',
            };
        }
        catch (error) {
            console.log(error);
            return {
                code: 500,
                success: false,
                message: `Internal server error >> ${error.message}`,
            };
        }
    }
    async vote(postId, inputVoteValue, { req: { session: { userId }, }, AppDataSource, }) {
        return await AppDataSource.transaction(async (transactionEntityManager) => {
            let post = await transactionEntityManager.findOneBy(Post_1.Post, { id: postId });
            if (!post)
                throw new apollo_server_core_1.UserInputError('Post not found');
            const existingVote = await transactionEntityManager.findOneBy(Upvote_1.Upvote, {
                userId,
                postId,
            });
            if (existingVote && existingVote.value !== inputVoteValue) {
                await transactionEntityManager.save(Upvote_1.Upvote, Object.assign(Object.assign({}, existingVote), { value: inputVoteValue }));
                post = await transactionEntityManager.save(Post_1.Post, Object.assign(Object.assign({}, post), { points: (post === null || post === void 0 ? void 0 : post.points) + 2 * inputVoteValue }));
            }
            if (!existingVote) {
                const newVote = transactionEntityManager.create(Upvote_1.Upvote, {
                    userId,
                    postId,
                    value: inputVoteValue,
                });
                await transactionEntityManager.save(newVote);
                post.points += inputVoteValue;
                post = await transactionEntityManager.save(post);
            }
            return {
                code: 200,
                success: true,
                message: 'Post voted',
                post,
            };
        });
    }
};
__decorate([
    (0, type_graphql_1.FieldResolver)((_return) => String),
    __param(0, (0, type_graphql_1.Root)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Post_1.Post]),
    __metadata("design:returntype", void 0)
], PostResolver.prototype, "textSnippet", null);
__decorate([
    (0, type_graphql_1.FieldResolver)((_return) => User_1.User),
    __param(0, (0, type_graphql_1.Root)()),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Post_1.Post, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "user", null);
__decorate([
    (0, type_graphql_1.FieldResolver)((_return) => type_graphql_1.Int),
    __param(0, (0, type_graphql_1.Root)()),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Post_1.Post, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "voteType", null);
__decorate([
    (0, type_graphql_1.Mutation)((_return) => PostMutationResponse_1.PostMutationResponse),
    (0, type_graphql_1.UseMiddleware)(checkAuth_1.checkAuth),
    __param(0, (0, type_graphql_1.Arg)('createPostInput')),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePostInput_1.CreatePostInput, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "createPost", null);
__decorate([
    (0, type_graphql_1.Query)((_return) => PaginatedPosts_1.PaginatedPosts, { nullable: true }),
    __param(0, (0, type_graphql_1.Arg)('limit', (_type) => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)('cursor', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "posts", null);
__decorate([
    (0, type_graphql_1.Query)((_return) => Post_1.Post, { nullable: true }),
    __param(0, (0, type_graphql_1.Arg)('id', (_type) => type_graphql_1.ID)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "post", null);
__decorate([
    (0, type_graphql_1.Mutation)((_return) => PostMutationResponse_1.PostMutationResponse),
    (0, type_graphql_1.UseMiddleware)(checkAuth_1.checkAuth),
    __param(0, (0, type_graphql_1.Arg)('updatePostInput')),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UpdatePostInput_1.UpdatePostInput, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "updatePost", null);
__decorate([
    (0, type_graphql_1.Mutation)((_return) => PostMutationResponse_1.PostMutationResponse),
    (0, type_graphql_1.UseMiddleware)(checkAuth_1.checkAuth),
    __param(0, (0, type_graphql_1.Arg)('id', (_type) => type_graphql_1.ID)),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "deletePost", null);
__decorate([
    (0, type_graphql_1.Mutation)((_return) => PostMutationResponse_1.PostMutationResponse),
    (0, type_graphql_1.UseMiddleware)(checkAuth_1.checkAuth),
    __param(0, (0, type_graphql_1.Arg)('postId', (_type) => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)('inputVoteValue', (_type) => VoteType_1.VoteType)),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "vote", null);
exports.PostResolver = PostResolver = __decorate([
    (0, type_graphql_1.Resolver)((_of) => Post_1.Post)
], PostResolver);
//# sourceMappingURL=post.js.map