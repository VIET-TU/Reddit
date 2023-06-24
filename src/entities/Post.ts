import { Field, ID, ObjectType } from 'type-graphql'
import {
	Entity,
	BaseEntity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	OneToMany,
} from 'typeorm'
import { User } from './User'
import { Upvote } from './Upvote'

@ObjectType()
@Entity()
export class Post extends BaseEntity {
	@Field((_type) => ID)
	@PrimaryGeneratedColumn()
	id: number

	@Field()
	@Column()
	title!: string

	@Field((_type) => User)
	@ManyToOne((_to) => User, (user) => user.posts)
	@JoinColumn({ name: 'userId' })
	user: User

	@OneToMany((_to) => Upvote, (upvote) => upvote.post)
	upvotes: Upvote[]

	@Field()
	@Column({ default: 0 })
	points!: number

	@Field({ nullable: true })
	voteType!: number

	@Field()
	@Column()
	userId!: number

	@Field()
	@Column()
	text!: string

	@Field()
	@CreateDateColumn({ type: 'timestamptz' })
	createdAt: Date

	@Field()
	@UpdateDateColumn({ type: 'timestamptz' })
	updateAt: Date
}
