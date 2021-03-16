/*
 *  Request handlers : @users, @tokens, @checks, @ping, @not_found
 *
 */

//  Dependencies
const { run } = require('./db')
const { hash, createRandomString } = require('./helpers')

//  Define the handlers
let handlers = {}

//  @Users
handlers.users = (data, callback)=>{
  const acceptableMethods = ['post', 'get', 'put', 'delete']
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._users[data.method](data, callback)
  }else{
    callback(405)
  }
}

//  Container for the users submethods
handlers._users = {}

//  @Users - post
//  Required data: email & password
//  Optional data: none
handlers._users.post = (data, callback)=>{
  //  Check that all required fields are filled out
  const email = typeof data.payload.email == 'string' && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false
  const password = typeof data.payload.password == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false

  if(email && password){
    //  Make sure that the user doesn't already exist
    run(`SELECT email from users WHERE email="${email}"`, (err, data)=>{
        if(!err){
            if(data.result.length == 0){
                const employeeId = createRandomString(12)
                run(`INSERT INTO users (employee_id, email, password) VALUES ("${employeeId}", "${email}", "${hash(password)}")`, (err, data)=>{
                    if(!err && data.result.affectedRows > 0){
                        callback(200)
                    }else{
                        callback(500, {'Error':'Failed to create the user'})
                    }
                })
            }else{
                callback(400, {'Error':'User with that email already exists'})
            }
        }else{
            callback(500, err)
        }
    })
  }else{
    callback(400, {'Error':'Missing required fields'})
  }
}

//  @Users - get
//  Required data: employee_id
//  Optional data: none
handlers._users.get = (data, callback)=>{
  //  Check that the email number provided is valid
  const employeeId = typeof data.queryStringObject.id == 'string' && data.queryStringObject.id.length == 12 ? data.queryStringObject.id.trim() : false
  if(employeeId){
    //  Get the token from the headers
    const token = typeof data.headers.token == 'string' ? data.headers.token :false
    //  verify that the given token is valid for the email number
    handlers._tokens.verifyToken(token, employeeId, (tokenIsValid)=>{
      if(tokenIsValid){
        //  Look up the user
        run(`SELECT employee_id, email FROM users WHERE employee_id = "${employeeId}"`, (err, data)=>{
          if(!err){
            if(data.result.length > 0){
              callback(200, {...data.result[0]})
            }else{
              callback(404)
            }
          }else{
            callback(500, err)
          }
        })

      }else{
        callback(403, {'Error':'Missing required token in header, or token is invalid'})
      }
    })

  }else{
    callback(400, {'Error':'Missing required field'})
  }
}

//  @Users - put
//  Required data : email, password
//  Optional data : none
// handlers._users.put = (data, callback)=>{
//   //  Check for the required field
//   const email = typeof data.payload.email == 'string' && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false
//   const password = typeof data.payload.password == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false

//     //  Error if the email is invalid
//     if(email && password){
//         //  Get the token from the headers
//         const token = typeof data.headers.token == 'string' ? data.headers.token :false
//         //  verify that the given token is valid for the email
//         handlers._tokens.verifyToken(token, email, (tokenIsValid)=>{
//           if(tokenIsValid){
//             //  Look up the user
//             _db.run(`SELECT email FROM users where email = "${email}"`, (err, data)=>{
//               if(!err){
//                 if(data.result.length > 0){
//                   //  Update the fields necessary
//                   _db.run(`UPDATE users SET password = "${hash(password)}" WHERE email = "${email}"`, (err, data)=>{
//                     if(!err && data.result.affectedRows > 0){
//                       callback(200)
//                     }else{
//                       callback(500, {'Error':'Could not update the user'})
//                     }
//                   })
//                 }else{
//                   callback(400, {'Error':'The specified user does not exist'})
//                 }
//               }else{
//                 callback(500, err)
//               }
//             })

//           }else{
//             callback(403,{'Error':'Missing required token in header, or token is invalid'})
//           }
//         })

//     }else{
//       callback(400,{'Error':'Missing required fields'})
//     }
// }

//  @Users - delete
//  Required field : employee_id
handlers._users.delete = (data, callback)=>{
  //  Check that the employee_id provided is valid
  const employeeId = typeof data.queryStringObject.id == 'string' && data.queryStringObject.id.length == 12 ? data.queryStringObject.id.trim() : false
  if(employeeId){
    //  Get the token from the headers
    const token = typeof data.headers.token == 'string' ? data.headers.token : false
    //  verify that the given token is valid for the email number
    handlers._tokens.verifyToken(token, employeeId, (tokenIsValid)=>{
      if(tokenIsValid){
        //  Look up the user
        run(`SELECT email FROM users where employee_id = "${employeeId}"`, (err, data)=>{
          if(!err){
            if(data.result.length > 0){
              run(`DELETE from users WHERE employee_id = "${employeeId}"`, (err, data)=>{
                if(!err && data.result.affectedRows > 0){
                  callback(200)
                }else{
                  callback(500, {'Error':'Could not delete the specified user'})
                }
              })
            }else{
              callback(400,{'Error':'Could not find the specified user'})
            }
          }else{
            callback(500, err)
          }
        })
      }else{
        callback(403,{'Error':'Missing required token in header, or token is invalid'})
      }
    })

  }else{
    callback(400, {'Error':'Missing required field'})
  }
}

//  @process
handlers.process = (data, callback)=>{
  const acceptableMethods = ['post', 'get', 'put']
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._process[data.method](data, callback)
  }else{
    callback(405)
  }
}

//  Container for all the process methods
handlers._process = {}

//  @process - post
//  Required data: start_time, elapse_time, employee_id
//  Optional data: none
handlers._process.post = (data, callback)=>{
  const startTime = typeof data.payload.start_time == 'string' && data.payload.start_time.length > 0 ? data.payload.start_time.trim() : false
  const elapseTime = typeof data.payload.elapse_time == 'string' && data.payload.elapse_time.length > 0 ? data.payload.elapse_time.trim() : false
  const employeeId = typeof data.payload.employee_id == 'string' && data.payload.employee_id.length == 12 ? data.payload.employee_id.trim() : false

  if(startTime && elapseTime && employeeId){
    //  Get the token from the headers
    const token = typeof data.headers.token == 'string' ? data.headers.token : false
    //  verify that the given token is valid for the employee_id
    handlers._tokens.verifyToken(token, employeeId, (tokenIsValid)=>{
      if(tokenIsValid){
        //  store values
        run(`INSERT INTO process (start_time, elapse_time, employee_id) VALUES ("${startTime}", "${elapseTime}", "${employeeId}")`, (err, data)=>{
          if(!err && data.result.affectedRows > 0){
            callback(200)
          }else{
            callback(500, {'Error':'failed to create process'})
          }
        })
      }else{
        callback(403,{'Error':'Missing required token in header, or token is invalid'})
      }
    })
  }else{
    callback(400, {'Error':'Missing required field(s)'})
  }
}

//  @process - get
//  Required data: id
//  Optional data: none
handlers._process.get = (data, callback)=>{
  const employeeId = typeof data.queryStringObject.userId == 'string' && data.queryStringObject.userId.length > 0 
  const processId = typeof data.queryStringObject.id == 'number' ? data.queryStringObject.id : false
  if(processId && employeeId){
    const token = typeof data.headers.token == 'string' ? data.headers.token : false
    handlers._tokens.verifyToken(token, employeeId, (tokenIsValid)=>{
      if(tokenIsValid){
        run(`SELECT * FROM process WHERE process_id = "${processId}"`, (err, data)=>{
          if(!err){
            if(data.result.length > 0){
              callback(200, {...data.result[0]})
            }else{
              callback(404)
            }
          }else{
            callback(500, err)
          }
        })
      }else{
        callback(403,{'Error':'Missing required token in header, or token is invalid'})
      }
    })
  }else{
    callback(400, {'Error':'Missing required field'})
  }
}

// @process - put
//  Required data: end_time, process_id
//  Optional data: none
handlers._process.put = (data, callback)=>{
  const processId = typeof data.payload.id == 'number' ? data.payload.id : false
  const employeeId = typeof data.payload.userId == 'string' && data.payload.userId.length > 0 ? data.payload.userId.trim() : false
  const endTime = typeof data.payload.end_time == 'string' && data.payload.end_time.length > 0 ? data.payload.end_time.trim() : false
  if(employeeId && endTime){
    const token = typeof data.headers.token == 'string' ? data.headers.token : false
    handlers._tokens.verifyToken(token, employeeId, (tokenIsValid)=>{
      if(tokenIsValid){
        run(`UPDATE process SET end_time = "${endTime}" WHERE process_id = "${processId}"`, (err, data)=>{
          if(!err && data.result.affectedRows > 0){
            callback(200)
          }else{
            callback(500, {'Error':'Could not update the end_time'})
          }
        })
      }else{
        callback(403,{'Error':'Missing required token in header, or token is invalid'})
      }
    })
  }else{
    callback(400, {'Error':'Missing required field'})
  }
}

//  @tokens
handlers.tokens = (data, callback)=>{
  const acceptableMethods = ['post', 'get', 'put', 'delete']
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._tokens[data.method](data, callback)
  }else{
    callback(405)
  }
}

//  Container for all the tokens methods
handlers._tokens = {}

//  @tokens - post
//  Required data: email, password
//  Optional data: none
handlers._tokens.post = (data, callback)=>{
    const email = typeof data.payload.email == 'string' && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false
    const password = typeof data.payload.password == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false
    if(email && password){
      //  Lookup the user who matches that email
      run(`SELECT employee_id, password FROM users WHERE email = "${email}" AND password = "${hash(password)}"`, (err, data)=>{
        if(!err){
          if(data.result.length != 0){
            //  If there is a match, create a new token with a random name. Set expiration data 1 hour in the future
            const tokenId = createRandomString(20)
            const expires = Date.now() + 1000 * 60 *60 //milliseconds
            const tokenObject = {
              id : tokenId,
              employeeId : data.result[0].employee_id,
              expires : expires
            }
            //  Store the token
            run(`INSERT INTO tokens (id, employee_id, expires) VALUES("${tokenObject.id}", "${tokenObject.employeeId}", "${tokenObject.expires}")`, (err, data)=>{
              if(!err && data.result.affectedRows > 0){
                callback(200, tokenObject)
              }else{
                callback(500, {'Error':'Could not create the new token'})
              }
            })
          }else{
            callback(400, {'Error':'User does not exist'})
          }
        }else{
          callback(500, err)
        }
      })

    }else{
      callback(400,{'Error':'Missing required field(s)'})
    }
}
//  @tokens - get
//  Required data : id
//  Optional data : none
handlers._tokens.get = (data, callback)=>{
  //  Check that the id is valid
  const id = typeof data.queryStringObject.id == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
  if(id){
    //  Look up the token
    run(`SELECT * FROM tokens WHERE id="${id}"`, (err, data)=>{
      if(!err){
        if(data.result.length > 0){
          callback(200, {...data.result[0]})
        }else{
          callback(404)
        }
      }else{
        callback(500, err)
      }
    })
  }else{
    callback(400, {'Error':'Missing required field'})
  }
}

//  @tokens - put
//  Required data : id, extend
//  Optional data : none
handlers._tokens.put = (data, callback)=>{
  const id = typeof data.payload.id == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false
  const extend = typeof data.payload.extend == 'boolean' && data.payload.extend == true ? true : false
  if(id && extend){
    //  Look up the token
    run(`SELECT * FROM tokens WHERE id="${id}"`, (err, data)=>{
      if(!err){
        if(data.result.length > 0){
          //  Check to make sure the token isn't already expired
          if(data.result[0].expires > Date.now()){
            //  Set the expiration an hour from now
            const newExpiry = Date.now() +1000 * 60 * 60
            run(`UPDATE tokens SET expires = "${newExpiry}" WHERE id="${id}"`, (err, data)=>{
              if(!err && data.result.affectedRows > 0){
                callback(200)
              }else{
                callback(500, err)
              }
            })
          }else{
            callback(400, {'Error':'The token has already expired, and cannot be extended'})
          }
        }else{
          callback(400,{'Error':'Specified token does not exist'})
        }
      }else{
        callback(500, err)
      }
    })

  }else{
    callback(400,{'Error':'Missing required field(s) or field(s) are invalid'})
  }
}
//  @tokens - delete
//  Required data: id
//  Optional data: none
handlers._tokens.delete = (data, callback)=>{
  //  Check that the id is valid
  const id = typeof data.queryStringObject.id == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false

  if(id){
    //  Look up the token
    run(`SELECT * FROM tokens WHERE id="${id}"`, (err, data)=>{
      if(!err){
        if(data.result.length > 0){
          run(`DELETE FROM tokens WHERE id="${id}"`, (err, data)=>{
            if(!err && data.result){
              callback(200)
            }else{
              callback(500, {'Error':'Could not delete the specified token'})
            }
          })
        }else{
          callback(500, {'Error':'Could not find the specified token'})
        }
      }else{
        callback(500, err)
      }
    })

  }else{
    callback(400, {'Error':'Missing required field'})
  }
}

//  Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, employee_id, callback)=>{
  //  Look up the token
  run(`SELECT * FROM tokens WHERE id="${id}"`, (err, data)=>{
    if(!err && data.result.length > 0){
      if(data.result[0].employee_id == employee_id && data.result[0].expires > Date.now()){
        callback(true)
      }else{
        callback(false)
      }
    }else{
      callback(false)
    }
  })

}

//  @ping handler
handlers.ping = (data, callback)=>{
  callback(200)
}

// @not_found handler
handlers.notFound = (data, callback)=>{
  callback(404)
}

// Export the module
module.exports = handlers
