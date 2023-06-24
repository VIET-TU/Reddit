import { Context } from '../@types/Context'
import { Resolver, Query, Ctx } from 'type-graphql'

@Resolver()
export class HelloResolver {
	@Query((_return) => String) // String is type-grapql
	hello(@Ctx() { req }: Context) {
		console.log(req.session.userId)
		return 'hello world'
	}
}
