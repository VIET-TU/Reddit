import { VoteType } from './../@types/VoteType'
import {
	Arg,
	Ctx,
	FieldResolver,
	ID,
	Int,
	Mutation,
	Query,
	Resolver,
	Root,
	UseMiddleware,
	registerEnumType,
} from 'type-graphql'
import { CreatePostInput } from '../@types/CreatePostInput '
import { PaginatedPosts } from '../@types/PaginatedPosts'
import { PostMutationResponse } from '../@types/PostMutationResponse'
import { UpdatePostInput } from '../@types/UpdatePostInput'
import { Post } from '../entities/Post'
import { User } from '../entities/User'
import { checkAuth } from '../middleware/checkAuth'
import { LessThan } from 'typeorm'
import { Context } from '../@types/Context'
import { UserInputError } from 'apollo-server-core'
import { Upvote } from '../entities/Upvote'

registerEnumType(VoteType, {
	name: 'VoteType', // this one is mandatory
})

@Resolver((_of) => Post)
export class PostResolver {
	@FieldResolver((_return) => String)
	textSnippet(@Root() root: Post) {
		return root.text.slice(0, 50)
	}

	@FieldResolver((_return) => User)
	async user(@Root() root: Post, @Ctx() { dataLoaders: { userLoader } }: Context) {
		// return await User.findOneBy({ id: root.userId })
		return await userLoader.load(root.userId)
	}

	@FieldResolver((_return) => Int)
	async voteType(@Root() root: Post, @Ctx() { req, dataLoaders: { voteTypeLoader } }: Context) {
		if (!req.session.userId) return 0
		// const existingVote = await Upvote.findOneBy({ userId: req.session.userId, postId: root.id })

		const existingVote = await voteTypeLoader.load({ userId: req.session.userId, postId: root.id })

		return existingVote ? existingVote.value : 0
	}

	@Mutation((_return) => PostMutationResponse)
	@UseMiddleware(checkAuth)
	async createPost(
		@Arg('createPostInput') { title, text }: CreatePostInput,
		@Ctx() { req }: Context
	): Promise<PostMutationResponse> {
		try {
			const newPost = Post.create({
				title,
				text,
				// user: newUser as User,
				userId: req.session.userId,
			})
			await newPost.save()
			return {
				code: 200,
				success: true,
				message: 'Post created successfully',
				post: newPost,
			}
		} catch (error) {
			console.log(error)
			return {
				code: 500,
				success: false,
				message: `Internal server error >> ${error.message}`,
			}
		}
	}

	@Query((_return) => PaginatedPosts, { nullable: true })
	async posts(
		@Arg('limit', (_type) => Int) limit: number,
		@Arg('cursor', { nullable: true }) cursor?: string
	): Promise<PaginatedPosts | null> {
		try {
			const totalPostCount = await Post.count()
			const realLimit = Math.min(10, limit)

			const findOptions: { [key: string]: any } = {
				order: {
					createdAt: 'DESC',
				},
				take: realLimit, // limit  data return
			}

			let lastPost: Post[] = []
			if (cursor) {
				findOptions.where = {
					createdAt: LessThan(cursor),
				}
				lastPost = await Post.find({ order: { createdAt: 'ASC' }, take: 1 })
			}

			console.log('findOptions :>> ', cursor)

			const posts = await Post.find(findOptions)

			return {
				totalCount: totalPostCount,
				cursor: posts[posts.length - 1].createdAt,
				hasMore: cursor
					? posts[posts.length - 1].createdAt.toString() !== lastPost[0].createdAt.toString()
					: posts.length !== totalPostCount,
				paginatedPosts: posts,
			}
		} catch (error) {
			console.log(error)
			return null
		}
	}

	@Query((_return) => Post, { nullable: true })
	async post(@Arg('id', (_type) => ID) id: number): Promise<Post | null> {
		try {
			return await Post.findOneBy({ id: id })
		} catch (error) {
			console.log(error)
			return null
		}
	}

	@Mutation((_return) => PostMutationResponse)
	@UseMiddleware(checkAuth)
	async updatePost(
		@Arg('updatePostInput') { id, title, text }: UpdatePostInput,
		@Ctx() { req }: Context
	): Promise<PostMutationResponse> {
		try {
			const existingPost = await Post.findOneBy({ id })
			if (!existingPost)
				return {
					code: 400,
					success: false,
					message: 'Post not found',
				}

			if (existingPost.userId !== req.session.userId) {
				return { code: 401, success: false, message: 'Unauthorised' }
			}

			existingPost.title = title
			existingPost.text = text

			await existingPost.save()

			return {
				code: 200,
				success: true,
				message: 'Post updated successfully',
				post: existingPost,
			}
		} catch (error) {
			console.log(error)
			return {
				code: 500,
				success: false,
				message: `Internal server error >> ${error.message}`,
			}
		}
	}
	@Mutation((_return) => PostMutationResponse)
	@UseMiddleware(checkAuth)
	async deletePost(
		@Arg('id', (_type) => ID) id: number,
		@Ctx() { req }: Context
	): Promise<PostMutationResponse> {
		try {
			const exitingPost = await Post.findOneBy({ id })
			if (!exitingPost)
				return {
					code: 400,
					success: false,
					message: 'Post not found',
				}
			if (exitingPost.userId !== req.session.userId) {
				return {
					code: 401,
					success: false,
					message: 'Unauthorzed',
				}
			}
			await Post.delete({ id })

			return {
				code: 200,
				success: true,
				message: 'Post deleted successfully',
			}
		} catch (error) {
			console.log(error)
			return {
				code: 500,
				success: false,
				message: `Internal server error >> ${error.message}`,
			}
		}
	}

	@Mutation((_return) => PostMutationResponse)
	@UseMiddleware(checkAuth)
	async vote(
		@Arg('postId', (_type) => Int) postId: number,
		@Arg('inputVoteValue', (_type) => VoteType) inputVoteValue: VoteType,
		@Ctx()
		{
			req: {
				session: { userId },
			},
			AppDataSource,
		}: Context
	): Promise<PostMutationResponse> {
		return await AppDataSource.transaction(async (transactionEntityManager) => {
			let post = await transactionEntityManager.findOneBy(Post, { id: postId })

			if (!post) throw new UserInputError('Post not found')

			// check if user has voted or not
			const existingVote = await transactionEntityManager.findOneBy(Upvote, {
				userId,
				postId,
			})
			if (existingVote && existingVote.value !== inputVoteValue) {
				await transactionEntityManager.save(Upvote, {
					...existingVote,
					value: inputVoteValue,
				})

				post = await transactionEntityManager.save(Post, {
					...post,
					points: (post?.points as number) + 2 * inputVoteValue,
				})
			}

			if (!existingVote) {
				const newVote = transactionEntityManager.create(Upvote, {
					userId,
					postId,
					value: inputVoteValue,
				})
				await transactionEntityManager.save(newVote) // neu userId va postId da ton tai thi no se save de len
				post.points += inputVoteValue
				post = await transactionEntityManager.save(post)
			}
			return {
				code: 200,
				success: true,
				message: 'Post voted',
				post,
			}
		})
	}
}
