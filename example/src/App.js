import React from 'react';
import './App.css';

function App() {

  function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return undefined;
  }

  return (
    <div className="App">
      <section className="App-container">
        <div className="code-block">
          <h2 className="Amazon-Orange">Description</h2>
          <blockquote>
            <p>
              This sample code renders the cookies passed to the application after the Cloudfront Distribution and Lambda@Edge request 
              trigger has been invoked and the user has successfully authenticated against the OpenID Connect Provider.
            </p>
            <p>  
              Once the Identity Provider provides a token the Lambda@Edge then exchanges the token 
              for AWS credentials via a Cognito Identity Pool which gets passed back to the application allowing for sign request to other AWS resources like Amazon API Gateway.  
            </p>
            <p>
              The cookies live for the length of the of the token/credentials so it would be impairative for the development team to implement some sort of refresh mechanism to check for the cookie before 
              make each request and refreshing if one no longer exists. 
            </p>
          </blockquote>
        </div>
        
        <div className="code-block">
        <h2 className="Amazon-Orange">Cookie details</h2>
      
        X-Forwarded-User:
          <pre>
            <code>
              {getCookie('x-forwarded-user') ? getCookie('x-forwarded-user') : 'X-Forwarded-User Not Found' }
            </code>
          </pre>

          Temporary AWS Credentials:
          <pre>
            <code>
              {getCookie('Credentials') ? getCookie('Credentials') : 'AWS Credentials Not Found'}
            </code>
          </pre> 

          Site Parameters:
          <pre>
            <code>
              {getCookie('WebIdentityParams') ? getCookie('WebIdentityParams') : 'Site Parameters Not Found'}
            </code>
          </pre> 
        </div>
      </section>
    </div>
  );
}

export default App ;
