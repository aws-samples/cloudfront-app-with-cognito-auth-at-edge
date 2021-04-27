# Edge Lambda Cognito Auth UI Example Using ReactJS.

This sample code demonstrates the output from a `Cloudfront` Distribution using `Lambda@Edge` to request an ID token from any `OpenId Connect Provider` and then exchanging that token for temporary, rotatable credentials using `Cognito Identity Pools`.  The application shows the returned cookies which a developer can then consumed to make calls to other AWS resources like Amazon API Gateway.

## Getting started

See the available scripts below to run, test and build the project.

Note that this sample code should live in the s3 bucket that will be served up by the Clouldfront distribution. Please see the [Tutorial](../README.TUTORIAL.md) for more detailed instructions on setting up the project. 

Also ensure that you `build` the code and copy the `build` folders contents to S3 once you run `npm run build`

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!