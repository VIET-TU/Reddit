import 'reflect-metadata'

import 'reflect-metadata'
import {
	BaseEntity,
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
} from 'typeorm'

import { ObjectType, Field, ID } from 'type-graphql'
import { Post } from './Post'
import { Upvote } from './Upvote'

@ObjectType() // typescript => type-graphql
@Entity() // typescript => PostgreSQL - database table
export class User extends BaseEntity {
	@Field((_type) => ID)
	@PrimaryGeneratedColumn() // index auto increase
	id!: number

	@Field()
	@Column({ unique: true })
	username!: string // type of typescirpt

	@Field()
	@Column({ unique: true })
	email!: string

	@Column()
	password!: string

	@OneToMany(() => Post, (post) => post.user)
	posts: Post[]

	@OneToMany((_to) => Upvote, (upvote) => upvote.user)
	upvotes: Upvote[]

	@Field()
	@CreateDateColumn() // imestamp with time zone
	createdAt: Date
	@Field()
	@UpdateDateColumn()
	updateAt: Date
}

// typeorm have decorators to make  typescript convert postgress sql
