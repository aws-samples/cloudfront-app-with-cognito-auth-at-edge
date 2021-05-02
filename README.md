# Edge Lambda Cognito Auth Using NodeJS and Javascript

A tool for easy authentication and authorization of users in `Cloudfront` Distributions by leveraging `Lambda@Edge` 
to request an ID token from any `OpenId Connect` Provider, 
then exchanging that token for temporary, 
rotatable credentials using `Cognito Identity Pools`.

## The Auth Lambda Instance
```javascript
const {AuthLambda} = require('cloudfront-app-with-cognito-auth-at-edge');

const authLambda = new AuthLambda(params:AuthLambdaParams);
```
## Auth Lambda Parameters
To initialize the Lambda@Edge all you need to do is determine the values for the `AuthLambdaParams` object that will be passed to the initialization function:

* ***url*** - The Url where your site can be accessed by authenticated users on the Internet.
*NOTE: all url values can be passed in this object with or without the `https://` prefix. 
It will be added and removed as necessary internally*

* ***provider*** - The url of the provider that will be authenticating the user's identity.

* ***identityPool*** - The Identity Pool Id of your Cognito Identity Pool. 
Identity Pool must be in same region as Cloudfront Distribution.

* ***handler*** *optional (default 'handler')* - The name of the handler to use for the `Lambda@Edge` export. 
Your main lambda file will be exported using this handler (`exports.handler = function`). 
For iac processes where a handler needs to be supplied, use `index.` plus this value.

* ***targetRoot*** *optional (default `process.cwd()`)* - The root of the path to your lambda build directory. Combines with `AuthLambda.targetPath` to get `authLambda.target`, which is the full path to the directory.

* ***targetPath*** *optional (default `build/auth_lambda`)* - The path to your built lambda directory. 
The value of `authLambda.target` will be the result of calling `path.join(AuthLambdaParams.targetRoot, AuthLambdaParams.targetPath)`.
If both `AuthLambdaParams.targetRoot` and `AuthLambda.targetPath` are `undefined`, then `authLambda.target` will be the `auth_lambda` directory inside your app's build folder.
When using the CDK you can make an `AssetCode` Construct by calling `new AssetCode(authLambda.target)`. 
Then you can pass that Construct to the Lambda Construct's `code` field as your function code.

* ***redirectPath*** *optional (default `<AuthLambdaParams.url>`)* - When the request for an id token is being made to your OIDC provider, one of the query parameters necessary is a `redirect_uri`. 
This value defaults to your url but if you want don't want the OIDC provider to redirect there you can provide a value here.
If this value is a relative path, it will be added to your url, otherwise it will replace it.

* ***env*** *optional (default undefined)* - Environment variables that can optionally be passed as a cookie object to your front end code. 
The values must be strings. To pass another `AuthLambdaParam` or Node env value through the env, add a `$` before the key:
```javascript
    AuthLambdaParams.env = {
        api: 'api.example.com',
        appName: 'myApp',
        idPool: '$identityPool',
        ranAt: '$INVOKE_TIME'
    }

    // ...later in code
    process.env.INVOKE_TIME = Date.now();
``` 

* ***invoke*** *optional (default undefined)* - You can also include a function to perform other logic you need to accomplish inside the edge lambda or 
if you want to update the values passed to it at runtime.
The `invoke` function is passed the initial `event`, `context`, and `callback` arguments provided to the lambda as well as: 
* the `AuthLambdaParams` object supplied to the initialization function
* the `AWS` sdk object available to all lambda functions
* the `AuthLambdaFunction` constructor that can initiate and handle the auth flow. 

So the default behavior of the lambda can be conditionally overridden by returning the `invoke` argument. For example:
```javascript
AuthLambdaParams.invoke = function(event,context,callback,params, AWS, AuthLambdaFunction) {
    if (event.uri === '/redirect') {
        return callback(null, {
            status:200,
            headers: {
                location: [{
                    key: 'Location',
                    value: 'https://my-redirect.com'
                }]
            }
        })
    }
}
``` 
This would bypass authentication and redirect to a different location when the request path is `/redirect`.
If you don't return the `callback` argument, the normal auth flow will occur after the callback is finished. 
If the `invoke` function returns an object or a Promise that returns an object, that object will be merged with the initial parameters before beginning the auth flow.
So if there are values that need to be accessed that aren't known yet, you could access those values using the sdk and add them to the params:
```javascript
    AuthLambdaParams.invoke = async function(event,context,callback,params, AWS, AuthLambdaFunction) {
            const cf = new AWS.CloudFormation();
            const data = await cf.listExports({}).promise();
            const pool = data.Exports.find(output => output.Name === 'my-identity-pool-id');
            if (pool) {
                return {identityPool: pool.Value}
            } else {
                return null;
            }
        });
    }
```
This looks for the output of a Cloud Formation stack with a specific name, 
then if found returns that output as the value for `AuthLambdaParams.identityPool`;

##### Example Auth Lambda Params Object
```json
{
    "url": "https://my-app.com",
    "provider": "https://my-open-id-provider.com",
    "identityPool": "us-east-1:my-identity-pool-id",
    "handler": "main",
    "targetPath": "build/lambda",
    "redirectPath": "/home",
    "env": {
        "api": "api.example.com",
        "appName": "myApp",
        "idPool": "$identityPool",
        "ranAt": "$INVOKE_TIME"
    }
}
```

## Implementing Lambda Function
The edge lambda  can be built programmatically with the static function `make`:
```javascript

    const {AuthLambda} = require("edge-lambda-cognito-auth");
    
    AuthLambda.make({
        url: "https://my-app.com",
        provider: "https://open-id-provider.com",
        identityPool: "us-east-1:my-identity-pool-id",
        invoke: (event, context, callback, params, aws, AuthLambdaFunction) => {
            console.log('Hello from Edge Lambda');
        }
    });
```
You can also call `AuthLambda.promise` if you want to run custom logic after the built completes, 
say if you're using the CDK and want to add the code as a construct:
```javascript
    const {Function, AssetCode} = require('@aws-cdk/aws-lambda');
     AuthLambda.promise({
        url: "https://my-app.com",
        provider: "https://open-id-provider.com",
        identityPool: "us-east-1:my-identity-pool-id",
        invoke: (event, context, callback, params, aws, AuthLambdaFunction) => {
            console.log('Hello from Edge Lambda');
        }
    }).then((pathToCode, handler) => {
    const code = new AssetCode(pathToCode);
    const lambda = new Function(scope, id, {
        code,
        handler
        //...etc
    })
```
You can also build the lambda by using the `auth-lambda` CLI command. 
When using this command on the command line or passing it to your build script in your `package.json`, for example, 
you can include the parameters in a `lambda.auth.json` or (if you want to pass an `invoke` function) `lambda.auth.js` file at the top level of your package.
You can also pass arguments straight to the `auth-lambda` command using flags:
```
auth-lambda --url my-app.com --provider my-provider.com --identityPool us-east-1:my-identity-pool-id
```

## Utility Functions
The `AuthLambda` class that can be accessed by calling `const {AuthLambda} = require('cloudfront-app-with-cognito-auth-at-edge')` contains several static helper functions that can be used to customize your setup:

* ***AuthLambda.createKeyPair*** *(options:KeyPairOptions)* - Generates a public/private key pair and returns both. Params object is intended to make function flexible but in most cases generating a key pair by using `AuthLambda.createKeyPair()` and allowing for the defaults will suffice.
***Key Pair Options***
* ***handler*** *optional (default 'rsa')*: 'rsa' | 'dsa' | 'ec' | 'ed25519' | 'ed448' | 'x25519' | 'x448' | 'dh'

* ***format*** *optional (default 'pem')*: 'pem' | 'der'

* ***length*** *optional (default 2048)*: number

* ***publicKeyType*** *optional (default 'spki')*: 'spki' | 'pkcs1' - *pkcs1* can only be used when type is *rsa*

* ***privateKeyType*** *optional (default 'pkcs8')*: 'pkcs8' | 'pkcs1' | 'sec1'  
*pkcs1* can only be used when type is *rsa*  
*sec1* can only be used when type is *ec

* ***cipher*** *optional (default undefined)*: string

* ***passphrase*** *optional (default undefined)*: string  


* ***AuthLambda.JwtDecode*** *(token:any)* - Parses a JWT token into an object. Returns null if token is invalid.

* ***AuthLambda.encode*** *(utf8EncodedString:string, destinationEncoding?:any = 'base64')* - You can use the second parameter to convert to any encoding you want but the default behavior of this function is to convert a utf8 encoded string to a base64 encoding a string.

* ***AuthLambda.decode*** *(str:string, sourceEncoding?:any = 'base64')* - The inverse of `AuthLambda.encode`, convert a string to 'utf8' encoding.

* ***AuthLambda.getCookie*** *(key:string,cookieString:string)* - Finds a particular cookie value within a cookie string and attempts to parse it if it's determined to be stringified JSON. If the key doesn't exist, returns `null`.

* ***AuthLambda.parseCookie*** *(cookieString:string)* - parses a cookie string into a cookie object. Calls `AuthLambda.getCookie` on each value.

* ***AuthLambda.formatCookie*** *(key:string,value:any, options:CookieOptions)*
***Cookie Options***
* ***path*** *optional (default '/')*: string

* ***domain*** *optional (default undefined)*: string

* ***secure*** *optional (default true)*: boolean

* ***httpOnly*** *optional (default false)*: boolean

* ***maxAge*** *optional (default undefined)*: Date | number | string

* ***expires*** *optional (default undefined)*: Date | number | string

* ***sameSite*** *optional (default undefined)* - 'strict' | 'lax' | 'none'

Encodes a value into a cookie string with selected options tacked on.
