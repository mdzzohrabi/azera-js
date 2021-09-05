# HTTP Bundle

HTTP Bundle perform needed structure for web-server applications. it uses `express` as provider for this functionality.

## Create a Controller
Controller is a class that handle http request for specified routes, below is a simple controller class :
```ts
import {Controller, Get} from '@azera/stack';

@Controller('/page')
export class PageController {

    @Get('/about') about() {
        return 'I\'m Masoud !';
    }

}
```
this is a simple controller that binds `/page/about` route to `about()` method and send simple response to client

## Response types (String, JSON, Buffer, Error)
If controller method returns a value, http bundle automatically guess your response type based on type of returned value as shown below :
```ts
/** when return type is "string" response type will be simple text **/
@Get('/simple_text') simpleText() {
    return 'Simple text';
}

/** when return type is "Buffer" response type will be buffered to client **/
@Get('/buffer_response') bufferResponse() {
    return fs.readFileSync('/images/logo.png');
}

/** when return type is instance of "Error" response code will be 500 and based on request "content-type", error message will send as json or simple to client **/
@Get('/error') errorResponse() {
    return Error("Some issued happen in our process");
}

/** and any other types will be considered as JSON **/
@Get('/json_response') jsonResponse() {
    return { ok: true, message: 'Im a JSON response' };
}
```

## Template
We can use template for our routes.
```ts
// PageController.ts
import {Controller, Template, Get} from '@azera/stack';

@Controller('/page')
export class PageController {

    @Template('about')
    @Get('/about')
    about() {
        // Send some variables to template
        return {
            version: '1.0.0'
        }
    }
}
```

```twig
{# /views/about.html.twig #}
<html>
    <body>
        About<br/>
        Current version {{ version }}
    </body>
</html>
```

## Handle File Uploads
To handle file uploads you must to tell method or controller to use `express-fileupload` middleware. File upload handling example :
```ts
import {Controller, HttpFileUpload, Get} from '@azera/stack';

// File upload handler middleware with custom configuration applied to entire controller
@HttpFileUpload({ limits: { fileSize: 50 * 1024 * 1024 } })
@Controller()
export class UploadController {

    @Get('/upload') uploadAction(request: Request) {
        // Save uploaded file to specified folder
        request.files.avatar.mv(__dirname + '/uploads' + request.files.avatar.name);
    }
}
```

`express-fileupload` middleware module : <https://www.npmjs.com/package/express-fileupload>


## Response Headers

Custom response headers:
```ts
import {Controller, Header, Get} from '@azera/stack';

@Controller()
export class CustomHeaderController {

    // Using Header decorator
    @Header('Cache-Control', 'public, max-age=0, must-revalidate')
    @Get('/custom_header_decorator')
    customHeaderDecorator() {
        return 'Custom header decorator';
    }

    // Using response object
    @Get('/custom_header')
    customHeader(response: Response) {
        response
            .header('Cache-Control', 'public, max-age=0, must-revalidate')
            .end('Custom header');
    }

}
```

## Get client (Request) data (Body, Param, Query)
```ts
import {Controller, Get, Post, Body, Param, Query} from '@azera/stack';

@Controller()
export class BookController {

    @Get('/show/:id') findBook(@Param() id: number, books: BookService) {
        return books.findOne(id);
    }

    @Post('/create') createNewBook(@Body() book: Book, books: BookService) {
        return books.create(book);
    }

}
```

## Request Validation
```ts
import {Controller, Get, Check, ErrorOnInvalidate} from '@azera/stack';

// Simple validation error handler middleware
@ErrorOnInvalidate()
@Controller()
export class BookController {

    // "id" parameter will be converted and validated to Number because of "number" decorator
    @Get('/book/:id') findOneBook(@Param() id: number) {
        return { id };
    }

    // Validate "query" parameter
    @Check('query', query => query.notEmpty())
    @Get('/book/search/:query') findBooks(@Param() query: string) {
        return { query };
    }

}
```

## Request converter
```ts
import {Controller, Get, ParamConverter} from '@azera/stack';

export class BookParamConverter extends AbstractParamConverter {
    @Inject() books: BookService;

    apply(configuration: ParamConverterConfiguration) {
        return this.books.findOne(configuration.value) ?: Error('Book not found');
    }

    supports(configuration: ParamConverterConfigration) {
        return configuration.paramType == Book;
    }
}

@Controller()
export class BookController {
    
    @ParamConverter(BookParamConverter)
    @Get('/book/:id')
    findBook(@Param() id: Book) {

    }

    @ParamConverter({ [Book]: (value, container) => container.invoke(BookService).findOne(value) })
    @Get('/book/:id')
    findBook(@Param() id: Book) {

    }


}
```