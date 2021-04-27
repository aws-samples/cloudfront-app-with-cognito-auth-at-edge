# Cloudfront Dist. w/ Cognito Auth Using Lambda@Edge in NodeJS

A tool for easy authentication and authorization of users in `Cloudfront` Distributions by leveraging `Lambda@Edge` to request an ID token from any `OpenId Connect` Provider, then exchanging that token for temporary, rotatable credentials using `Cognito Identity Pools`.

To get started all you need is:

* A [Cloudfront Distribution](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-overview.html) 

* A [Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html) to integrate with an [Open Id Connect](https://openid.net/connect/) Provider.

* A [Lambda Function](https://docs.aws.amazon.com/lambda/latest/dg/lambda-functions.html) in the us-east-1 region, which is currently the only region where Lambda@Edge can originate. Make sure the Lambda function follows all of the [additional restrictions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-requirements-limits.html) imposed on Lambda@Edge functions as well.


## Setup

1. Using the [CDK](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.Distribution.html), the AWS console, or any method you choose, deploy a [Cloudfront Distribution](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-creating-console.html) to serve up your app.

2. Then, [set up a Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html).

3. Next, [add your chosen OIDC Provider](https://docs.aws.amazon.com/cognito/latest/developerguide/open-id.html) under `Identity Providers` in `Identity and Access Management` as well as to the Identity Pool. 
*Note: Any time your app's domain or subdomain changes, you MUST add that Url as an Audience to the Identity Provider in IAM* 

4. After your Lambda is created you'll need to [associate it with your Cloudfront Distribution](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-edge-how-it-works-tutorial.html#lambda-edge-how-it-works-tutorial-add-trigger).

5. Finally, upload the [demo code](/example/) to S3 and associate it in the Clouldfront Distribution using [Origin Acccess Identity](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html).

## Lambda@Edge
See [README](/README.md)

## Demo
See [Example Directory](/example/README.md)

## Handling Credentials

After the Lambda@Edge is in place, update your app's front end code to search for and access the cookies that Lambda@Edge will pass to the front end after successful authentication.
```javascript
function getCookie(cookieName, cookie) {
    if (typeof cookie !== 'string') return null;
    const pair = cookie.split(/; */).find(a => a.includes(`${key}=`));
    if (pair) {
        const arr = pair.split('=');
        if (arr.length < 2) return null;
        let val = arr[1].trim();
        if (val[0] == '"') {
        val = val.slice(1, -1);
        }
        const res = decodeURIComponent(val);
        // if the cookie string represents an object, parse the object, otherwise return the string
        try {
            return JSON.parse(res);
        } catch(e) {
            return res;
        }
    }
    return null;
}
const cookie = document.cookie;
const credentials = getCookie('Credentials', cookie);
const username = getCookie('x-forwarded-user', cookie);
const {api, region} = getCookie('WebIdentityParams', cookie);
```
The `Credentials` cookie will hold the temporary credentials issued by Cognito specifically for the authenticated user as well as the time that the credentials will expire and need to be refreshed.

If the OIDC Provider supplies a username for the federated identity, that will be available in the `x-forwarded-user` cookie.

The `WebIdentityParams` cookie is an object that contains the region and the url needed to connect with API Gateway for API calls, assuming they are provided to the function.

Once the `Credentials` cookie is retrieved, you can find out when the credentials will expire and need to be refreshed by accessing `credentials.Expiration`. At this time you can send a regular post or get request to your root domain and the Edge Lambda will go through all the steps necessary to refresh the credentials.

Once the credentials are refreshed, you can access the new credentials simply by parsing `document.cookie` in the same way you did to get the credentials initially.
