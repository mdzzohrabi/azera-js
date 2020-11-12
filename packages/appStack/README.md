# Azera Stack - A Full-Stack NodeJS Framework

A full-stack NodeJS Framework influenced by Symfony

## Features
- TypeScript
- Bundle
- Dependency Injection
- Configuration
- Decorators (Template, Routing, ...)
- Cli Command
- Maker (Controller, Entity, ...)
- Simplicity
- EventManager
- Message Manager (Message-Queue, Email, SMS, ...)
- SQL and NoSQL (TypeORM, Mongoose, MongoDb)
- Authentication and Authorization
- Http Client and HTML parser
- Profiler
- WorkFlow Manager
- Proxy Manager
- Meta-data Manager

## Install
Execute this commands in your project directory :
```sh
# Initialize your project directory
yarn init

# Install Azera Stack module and initialize project structure
yarn add @azera/stack

# Build to generate dist from typescript files
yarn build

# Done !
```
Aftre than you will see this folder stucture in your directory :
```
- src
    - index.ts
- tests
- app.config.json
- tsconfig.json
```
Also `cli`, `web`, `watch` and `build` scripts will be added to your `package.json` , then add your first controller by next step.

## Make Controller
Make a controller by following command :
```sh
yarn cli make:controller [Name] --path [Route path]
```
for example you may want to add Book controller :
```sh
yarn cli make:controller Book
```
it will generate `BookController.ts` with route path `/book` and add `BookController` to your `app.config.json > services`

## Make Entity
```sh
# Make a TypeORM (SQL) entity :
yarn cli make:entity [Name]

# Make a TypeORM (Mongo) document :
yarn cli make:entity [Name] --mongo
```

## Configuration
Azera stack is based on configuration file (default: `"app.config.json"`), many configuration and customization will be configured in that file. for example you may want to config your database connection :
```js
// app.config.json
{
	"typeOrm": {
		"connections": {
            // You can have multiple different connections
			"app": {
				"database": "test",     // Database name
				"host": "127.0.0.1",    // Database Host
				"username": "test",     // Database username
				"password": "test",     // Database password
				"type": "mssql",        // Connection driver
				"entities": [
					"/entity/Book" // instead of "/src/entity/Book.ts"
				]
			}
        },
        // Default connection name
        "defaultConnection": "app"
	}
}
```

and you can use your entities in you application :
```ts
// src/controller/BookController.ts
import { Controller, Get, Inject, Param, Request, Response } from '@azera/stack';
import { EntityManager } from 'typeorm';
import { Book } from '../entity/Book';

@Controller('/book')
export class BookController {

    @Get('/') @Inject() async books(em: EntityManager) {
        return em.find(Book);
    }

    @Get('/book/:id') @Inject() async book(em: EntityManager, @Param() id: string) {
        return em.findOne(User, id);
    }

}
```
That's simple

## Build your project
```sh
yarn build
# Or
yarn watch
```

## Authors
- Masoud Zohrabi (mdzzohrabi@gmail.com)