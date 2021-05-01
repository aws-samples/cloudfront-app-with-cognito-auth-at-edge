declare module "cloudfront-app-with-cognito-auth-at-edge" {
    import { CognitoIdentityCredentials } from "aws-sdk";
    export interface AuthLambdaParams {
        url: string
        provider:string
        identityPool:string
        handler?:string
        targetPath?:string
        targetRoot?:string
        redirectPath?:string
        env?:{[name:string]:string | number}
        invoke?:(...args:any[]) => AuthLambdaReturn
    }
    export type AuthLambdaReturn =  ReturnType<AuthLambdaCallback>
    export type AuthLambdaFunction = (event:AuthLambdaEvent, context:any,callback:AuthLambdaCallback) => AuthLambdaReturn
    export type AuthLambdaHeader = $AuthLambdaHeader[]
    export interface AuthLambdaHeaders {
        [name:string]: AuthLambdaHeader
    }
    export interface AuthLambdaEvent {
        Records: { cf: Cf }[]
    }
    export type AuthLambdaCallback = (a:any, b: AuthLambdaRequest |AuthLambdaResponse) => any
    export interface Cf {
        request: AuthLambdaRequest
        response?: AuthLambdaResponse
    }
    export interface AuthLambdaRequest {
        readonly uri: string
        readonly querystring:string
        headers?:AuthLambdaHeaders
    }
    export interface AuthLambdaResponse {
        status:number
        statusDescription?:string
        body?: string | {[name:string]:any}
        bodyEncoding?: string
        headers?: AuthLambdaHeaders
    }
    export interface AuthLambdaCookieOptions {
        expires?:Date | number
        maxAge?:number
        secure?:boolean
        httpOnly?:boolean
        domain?:string
        path?:string
        encode?:string
        sameSite?: true | 'strict' | 'lax' | 'none'
    }
    export interface AuthLambdaRedirectParams {
        redirect_uri: string,
        client_id: string,
        nonce: string,
        scope: 'openid',
        response_type: 'id_token',
        response_mode: 'query'
    }
    export interface AuthLambdaCredentials {
        AccessKeyId:string
        SecretKey:string
        Expiration:string
        SessionToken?:string
    }
    export interface CognitoCredentialsResponse {
        IdentityId:string
        Credentials: AuthLambdaCredentials
    }
    interface $AuthLambdaHeader {
        key:string
        value:string
    }
    type OnError = (e:any) => void
    type OnSuccess = (credentials:AuthLambdaCredentials) => any
    export class Token {
        url:string
        provider:string
        redirectPath:string
        isValid:boolean
        isExpired:boolean
        validate:() => boolean
        getRedirectParams:() => AuthLambdaRedirectParams
        formatRedirectParams:() => string
        setError:(str:string, obj:any) => this
        reset:() => this
        set:(token:string) => this | false 
    }
    export class Credentials {
        params: AuthLambdaParams
        token:string
        provider:string
        cognito:CognitoIdentityCredentials
        isValid:(credentials:AuthLambdaCredentials) => boolean
        getExpires:(credentials:AuthLambdaCredentials) => number
        get:(onSuccess:OnSuccess,onError:OnError) => this
        refresh:(onSuccess:OnSuccess,onError:OnError) => this
        setToken:(token:string) => this
        parseCredentials:(credentials:AuthLambdaCredentials) => AuthLambdaCredentials | null
        onSuccess:(c:OnSuccess, e?:OnError) => any
        onError:(e:any, c?:OnError) => void
    }
    export class EdgeLambdaCognitoAuth {
        constructor(event:AuthLambdaEvent,callback:AuthLambdaCallback,params:AuthLambdaParams)
        token:Token
        credentials:Credentials
        params: AuthLambdaParams
        request:AuthLambdaRequest
        callback:AuthLambdaCallback
        path:string
        region:string
        cookie:{[name:string]:any}
        cookieString:string
        static init:(event:AuthLambdaEvent,callback:AuthLambdaCallback,params:AuthLambdaParams) => AuthLambdaReturn
        init:() => AuthLambdaReturn
        send:(status:number,body?:any,headers?:AuthLambdaHeaders) => AuthLambdaReturn
        redirect:() => AuthLambdaReturn
        checkForToken:() => string | false
        checkForCredentials:() => AuthLambdaCredentials | false
        setCookies:(headers:AuthLambdaHeader[]) => AuthLambdaReturn
        getCookies:(token: string, creds:AuthLambdaCredentials,user?:string, additionalCookies?:AuthLambdaHeader[]) => AuthLambdaHeader[]
    }
    export class AuthLambda {
        constructor(params:AuthLambdaParams)
        params:AuthLambdaParams
        source:string
        dest:string
        handler:string
        function:string
        static make:(
            params:AuthLambdaParams,
            callback:(...a:any[]) => any,
            onError?:(...a:any[]) => any
        ) => AuthLambda
        static promise:(params:AuthLambdaParams) => Promise<any>
        make:(
            callback:(...a:any[]) => any,
            onError?:(...a:any[]) => any
        ) => this
        promise:() => Promise<any>
        copy:() => any
        handle:() => any
    }
}