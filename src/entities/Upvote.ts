import 'reflect-metadata'

import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { User } from './User'
import { Post } from './Post'

@Entity()
export class Upvote extends BaseEntity {
	@PrimaryColumn()
	userId!: number

	@JoinColumn({ name: 'userId' })
	@ManyToOne((_to) => User, (user) => user.upvotes, {
		onDelete: 'CASCADE',
	})
	user: User

	@PrimaryColumn()
	postId!: number

	@JoinColumn({ name: 'postId' })
	@ManyToOne((_to) => Post, (user) => user.upvotes, {
		onDelete: 'CASCADE',
	})
	post: Post

	@Column()
	value!: number
}
