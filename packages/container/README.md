# Azera Container

- [Intro](##Intro)
- [Property Injection](##Property%20Injection)
- [Container-aware class](##Container-aware%20class)
- [Factory](##Factory)
- [Tags](##Tags)
- [Auto tagging](##Auto%20tagging)
  - [Create custom auto tagging function](###Create%20custom%20auto%20tagging%20function)
- [Predefined Services and Parameters](##Predefined%20Services%20and%20Parameters)

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

### Auto tagging
You can do tagging automatically :
```typescript
import {Container} from "@azera/container";

abstract class Command { }

class RunCommand extends Command {}
class HelpCommand extends Command {}

container
  .autoTag(Command, [ 'command' ])
  .add(RunCommand, HelpCommand);
  
class ConsoleApp {
  @Inject('$$command') commands: Command[];
}

let app = container.invoke(ConsoleApp);
```

#### Create custom auto tagging function
```typescript
container.autoTag( definition => {
  return definition.name.endsWith('Command') ? ['command'] : []
})
```

## Predefined Services and Parameters
```typescript
// services.ts
import {Inject} from "@azera/container";

export default {
  app: class App {
    @Inject('logger') logger: Logger;
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