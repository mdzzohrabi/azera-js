# Azera Container

- [Intro](##Intro)
- [Property Injection](##Property%20Injection)
- [Container-aware class](##Container-aware%20class)
- [Factory](##Factory)
- [Tags](##Tags)
- [Auto tagging](##Auto%20tagging)
  - [Create custom auto tagging function](###Create%20custom%20auto%20tagging%20function)
- [Predefined Services and Parameters](##Predefined%20Services%20and%20Parameters)
- [Type-based injection](##Type-based%20injection)
- [Async](#Async)

## Intro
Azera container is a `dependency injection` service container for `JavaScript` written in `Typescript`.

First simple example :
```javascript
import {Container} from "@azera/container";

let container = new Container;

container.set('logger', class Logger {
  log(message) {}
})

let app = container.invoke(['logger', class App {
  constructor(logger) {
    logger.log('Initialize app');
  }
}]);
```

Simple injection with decorators in Typescript :
```typescript
import {Service, Container} from "@azera/container";

class Logger {
  @Inject('loggerNS') namespace: string;
  log(message) { console.log(`[${this.namespace}] ${message}`); }
}

@Inject([ Logger ]) class App {
  constructor(private logger: Logger) {}
  init() { this.logger.log('Initailize application'); }
}

let container = new Container();
// Set a parameter
container.setParameter('loggerNS', 'app');
// Create an instance from App
let app = container.invoke(App);
app.init();
// Console output : "[app] Initialize application"
```

## Property injection
```typescript
class App {
  @Inject('logger') logger: Logger;
}
```
Simply !

## Container-aware class
```typescript
import {ContainerAware, Container} from "@azera/container";

@Service('logger') class Logger {
  log(message) { console.log(message); }
}

class App extends ContainerAware() {
  init() {
    this.container.get('logger').log('Initialize app');
  }
}

let container = new Container();
container.add(Logger);
let app = container.invoke(App);
app.init(); // output: Initialize app
```

## Factory
You can also use factories to generate services, only add Factory to the end of function name :
```typescript
import {Container} from "@azera/container";

class Logger {
  log() {}
}

container.set('logger', function loggerFactory() {
  return new Logger;
});

let logger: Logger = container.get('logger');
// Or
let logger = container.get<Logger>('logger');
```

## Tags
Also you can define tag for services :
```typescript
import {Container, Tag} from "@azera/container";

abstract class Command { }

@Tag('command') class RunCommand extends Command {}
@Tag('command') class HelpCommand extends Command {}

let container = new Container;
container.add(RunCommand, HelpCommand);

let commands: Command[] = container.getByTag<Command>('command');
// Or inject them
class ConsoleApp {
  @Inject('$$command') commands: Command[];
}
```

### Auto-Tagging
You can do tagging automatically :
```typescript
import {Container} from "@azera/container";

abstract class Command { }

class RunCommand extends Command {}
class HelpCommand extends Command {}

container
  .autoTag(Command, [ 'commands' ])
  .add(RunCommand, HelpCommand);
  
class ConsoleApp {
  // When property is array it will assumes as tagged an its named used as tag name
  @Inject() commands: Command[];

  // When when property name differs from tag name we can use $$[tagName] as service name to inject tags 
  @Inject('$$commands') commandsList: Command[];
}

let app = container.invoke(ConsoleApp);
```

#### Create custom auto tagging function
```typescript
container.autoTag(definition => {
  return definition.name.endsWith('Command') ? ['command'] : []
})
```

## Predefined Services and Parameters
```typescript
// services.ts
import {Inject} from "@azera/container";

export default {


  app: class App {

    @Inject('logger')
    logger: Logger;
    
    run() {
      // Run logic
    }

  },

  // You can also declare service with Definition schema
  logger: {
    service: class Logger {
      constructor(private ns: string) {}
    },
    parameters: [ '$loggerNS' ]
  }
}
```
```typescript
// parameters.ts
export default {
  loggerNS: 'app'
}
```
```typescript
// index.ts
import {Container} from "@azera/container";
import Services from "./services";
import Parameters from "./parameters";

let container = new Container(Services, Parameters);
let app = container.get('app');
app.run();
```


## Type-based injection
We can also emit service configuration and naming and use type-based injection.

```typescript
// Logger.ts
export default class Logger {
  log(message: string) {
    console.log(message);
  }
}
```
```typescript
// App.ts
import Logger form './Logger.ts'

export default class App {
  constructor(@Inject() public logger: Logger) {}
}
```
```typescript
// index.ts
import App from './App.ts';

new Container()
  .invoke(App)
  .logger
  .log('Hello World');
```


## Async
```typescript
@Service({
  factory: async function connectionFactory() {
    let connection = new Connection();
    await connection.connect();
    return connection;
  }
})
class Connection {
  name = "default";
  async connect() { /** Connection logic **/ }
  async execute(query: string) { /** Command Exection **/ }
}

class Model {
  constructor(@Inject() connection: Connection) {}
}

async function run() {
  let container = new Container();
  let model = await container.invokeAsync(Model); // Model will resolve after conectionFactory() resolve
  let result = model.connection.execute("SELECT * FROM User");
}

```