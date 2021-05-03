const {AuthLambdaEdge} = require('../lib');
const AWS = require('aws-sdk');

exports.handler = function(params = {}) {
    return function(event,context,callback) {
      if (params.invoke && typeof params.invoke === 'string') {
        params.invoke = Function(params.invoke);
      }
      if (typeof params.invoke === 'function') {
          const addlParams = params.invoke(event,context,callback,params, AWS, AuthLambdaEdge);
          if (addlParams) {
            if (typeof addlParams.then === 'function') {
              addlParams.then(addl => {
                if (typeof addl === 'object') params = {
                  ...params,
                  ...addl
                }
              });
              return AuthLambdaEdge.init(event, callback, params);
            }
            if (typeof addlParams === 'object') params = {
              ...params,
              ...addlParams
            }
          }
      }
      return AuthLambdaEdge.init(event, callback, params);
    }
  }