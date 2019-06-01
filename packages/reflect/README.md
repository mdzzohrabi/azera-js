# Azera Reflect

### isCallable( value ): boolean
```typescript
import {isCallable} from "@azera/reflect";

isCallable(function () {}); // true
isCallable(class {}); // false
```

### isClass( value ): boolean
```typescript
import {isClass} from "@azera/reflect";

isClass(function () {}); // false
isClass(class {}); // true
```

### isMethod( value ): boolean
```typescript
import {isMethod} from "@azera/reflect";

class Console {
  static print() {}
}

isMethod(Console.print); // true
isMethod(function () {}); // false
isMethod( name => null ); // false
iisMethod( class {} ); // false
```

### getParameters( value ): string[]
```typescript
import {getParameters} from "@azera/reflect";

getParameters( name => `Hello ${name}` ); // [ 'name' ]
getParameters( (first, last) => `Hello ${first} ${last}` ); // [ 'first', 'last' ]
getParameters( function ( options ) {} ); // [ 'options' ]
getParameters(class App {
  constructor( version ) {}
}); // [ 'version' ]

getParameters(function ({ name, age }) {}); // [ 'p0' ]
```

### reflect(value: Function)
```typescript
import {reflect} from "@azera/reflect";

console.log( reflect(class Console {
    constructor(version) {}
}) );
```
Output :
```json
{
  name: 'Console',
  isClass: true,
  isFunction: false,
  isAnonymous: false,
  isArrow: false,
  parameters: [ 'version' ],
  toString: 'class Console {\r\n            constructor(version) { }\r\n        }'
 }
```