/**
 * @TODO: create authorization on teadata enpoints, update docs
 */
//  Dependencies
const config = require('./config')
const { run } = require('./db')
const { hash, createRandomString, parseJsonToObject, msToTime } = require('./helpers')
const _data = require('./data')
const express = require('express')
const app = express()
const { send } = require('./mailgun')
const jwt = require('jsonwebtoken')

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
const cors = require('cors');
const bodyParser = require('body-parser')



app.use(cors({optionSuccessStatus: 200}));  // some legacy browsers choke on 204
app.use(bodyParser.json()) // for parsing application/json
// app.use(bodyParser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
// app.use(bodyParser.text({ type: '*/*' })) // for parsing application/x-www-form-urlencoded
app.use((req, res, next)=>{
    res.setHeader('Content-Type', 'application/json')
    next()
})

const multer = require('multer')
const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        cb(null, `${__dirname}/../.data/images/`)
    },
    filename: (req, file, cb)=>{
        cb(null , `${file.fieldname}-${Date.now()}.${file.originalname.split('.')[1]}`)
    }
})
const upload = multer({
    storage: storage,
    // From https://www.positronx.io/multer-file-type-validation-tutorial-with-example/
    fileFilter: (req, file, cb) => {
        if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
          cb(null, true);
        } else {
          cb(null, false);
          return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
      }
})
// http://expressjs.com/en/starter/static-files.html
// app.use(express.static('public'));
//  @Users - post
//  Required data: email & password
//  Optional data: none
app.post("/api/users", (req, res)=>{
    const email = typeof req.body.email == 'string' && req.body.email.trim().length > 0 ? req.body.email.trim() : false
    const password = typeof req.body.password == 'string' && req.body.password.trim().length > 0 ? req.body.password.trim() : false
    if(email && password){
        //  Make sure that the user doesn't already exist
        run(`SELECT email from users WHERE email="${email}"`, (err, data)=>{
            if(!err){
                if(data.result.length == 0){
                    const employeeId = createRandomString(12)
                    run(`INSERT INTO users (employee_id, email, password) VALUES ("${employeeId}", "${email}", "${hash(password)}")`, (err, data)=>{
                        if(!err && data.result.affectedRows > 0){
                          //  Email verification
                          const activationCode = createRandomString(12)
                          const expires = Date.now() + 1000 * 60 * 60 //milliseconds
                          //  Store activation code
                          run(`INSERT INTO email_verification (employee_id, activation_code, expires) VALUES ("${employeeId}", "${activationCode}", "${expires}")`, (err, data)=>{
                            if(!err && data.result.affectedRows > 0){
                              //  send activation link via email
                              send('emailConfirmation', email, `http://localhost:3000/api/users/activate/${employeeId}/${activationCode}`, (err, data)=>{
                                if(!err){
                                  res.sendStatus(201)
                                }else{
                                  res.status(408).json({'Error':`Email forwarding failed with ${err}, sign up complete, contact admin for account activation`})
                                }
                              })
                            }else{
                              res.status(500).json({'Error':'failed to create email verification'})
                            }
                          })
                        }else{
                          res.status(500).json({'Error':'Failed to create the user'})
                        }
                    })
                }else{
                    res.status(400).json({'Error':'User with that email already exists'})
                }
            }else{
                res.status(500).json(err)
            }
        })   
    }else{
        res.status(400).json({'Error':'Missing required field(s)'})
    }
})

//  @Users - get
//  Required data: employee_id
//  Optional data: none
// app.get("/api/users/:id", (req, res)=>{
//     const employeeId = typeof req.params.id == 'string' && req.params.id.length == 12 ? req.params.id.trim() : false
//     if(employeeId){
//       //  Get the token from the headers
//       const token = typeof req.headers.token == 'string' ? req.headers.token :false
//       //  verify that the given token is valid for the email number
//       verifyToken(token, employeeId, (tokenIsValid)=>{
//         if(tokenIsValid){
//           //  Look up the user
//           run(`SELECT employee_id, email FROM users WHERE employee_id = "${employeeId}"`, (err, data)=>{
//             if(!err){
//               if(data.result.length > 0){
//                 res.status(200).json({...data.result[0]})
//               }else{
//                 res.sendStatus(404)
//               }
//             }else{
//               res.status(500).json(err)
//             }
//           })
  
//         }else{
//             res.status(403).json({'Error':'Missing required token in header, or token is invalid'})
//         }
//       })
  
//     }else{
//         res.status(400).json({'Error':'Missing required field'})
//     }
// })

//  @Users - get
//  Required data : activationCode
//  Optional data : none
app.get("/api/users/activate/:id/:code", (req, res)=>{
  const employeeId = typeof req.params.id == 'string' && req.params.id.trim().length == 12 ? req.params.id.trim() : false
  const activationCode = typeof req.params.code == 'string' && req.params.code.trim().length == 12 ? req.params.code.trim() : false
  if(activationCode && employeeId){
    //  Check for validity
    run(`SELECT activation_code, employee_id, expires FROM email_verification WHERE employee_id = "${employeeId}" AND activation_code = "${activationCode}"`, (err, data)=>{
      if(!err){
        if(data.result.length > 0){
          //  Check for expiry of the link
          const isExpired = data.result[0].expires > Date.now() ?  false : true
          if(!isExpired){
            //  Update the user account
            run(`UPDATE users SET status = "1" WHERE employee_id = "${employeeId}"`, (err, data)=>{
              if(!err && data.result.affectedRows > 0){
                res.redirect('http://localhost:8080/')
              }else{
                res.status(500).json({'Error':'Could not activate the user'})
              }
            })
          }else{
            res.status(403).json({'Error' : 'link expired'})
          }
        }else{
          res.status(400).json({'Error':'Invalid activation code or id'})
        }
      }else{
        res.status(500).json(err)
      }
    })
  }else{
    res.status(403).json({'Error' : 'Invalid activation link'})
  }
})

/*
 *Reset password with jwt from https://www.smashingmagazine.com/2017/11/safe-password-resets-with-json-web-tokens/
 */
//  @Users - put alias "forgot password"
//  Required data : email
//  Optional data : none
app.put("/api/users", (req, res)=>{
  //  Check for the required field
  const email = typeof req.body.email == 'string' && req.body.email.trim().length > 0 ? req.body.email.trim() : false
  //  Error if the email is invalid
  if(email){
    //  Look up the user
    run(`SELECT employee_id, email, password FROM users WHERE email = "${email}" AND status = "1"`, (err, data)=>{
      if(!err){
        if(data.result.length > 0){
          const payload = {
            id: data.result[0].employee_id,
            email: data.result[0].email
          }
          const secret = data.result[0].password
          const token = jwt.sign(payload, secret)
          const resetLink = `http://localhost:3000/api/resetpassword/${payload.id}/${token}`
          send('passwordReset', email, resetLink, (err, data)=>{
            if(!err && data){
              res.sendStatus(200)
            }else{
              res.status(408).json({'Error':`Email forwarding failed with ${err}, contact admin for support.`})
            }
          })
        }else{
          res.status(400).json({'Error':'The specified user does not exist or account is not activated'})
        }
      }else{
        res.status(500).json(err)
      }
    })
  }else{
    res.status(400).json({'Error':'Missing required fields'})
  }
})

//  Required data : id, token
//  Optional data : none
app.get('/api/resetpassword/:id/:token', (req, res)=>{
  const userId = typeof req.params.id == 'string' && req.params.id.trim().length == 12 ? req.params.id.trim() : false
  const token = typeof req.params.token == 'string' && req.params.token.trim().length > 0 ? req.params.token.trim() : false
  if(userId && token){
    //  Look up the user
    run(`SELECT password FROM users WHERE employee_id = "${userId}"`, (err, data)=>{
      if(!err){
        // showcase form for changing password
        if(data.result.length > 0){
          const secret = data.result[0].password
          let payload;
          try{
            payload = jwt.verify(token, secret)
            // res.status(200).json({
            //   id: payload.id,
            //   token: token
            // })
            //Form to reset password
        res.send(
          `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="viewport" content="width=device-width,initial-scale=1.0">
                <style>
                html{
                  width:100vw;
                }
                body{
                  margin:0;
                  x-overflow:hidden;
                }
                .logo{
                  font-family:sans-serif;
                  font-weight:700;
                  font-size:1.5rem;
                  margin-top:5px;
                  padding:0 10px;
                  color:#FFFFFF;
                  text-shadow:2px 2px #ADD8E6;
                }
                form{
                  margin:60px 2px;
                  background:#f8f8ff;
                  padding:40px 15px 100px;
                  text-align:center;
                }
                @media screen and (min-width: 600px) {
                  .logo{
                    font-size:2rem;
                    padding:0 10px 10px 10px;
                  }
                  form{
                    width:55%;
                    margin:60px auto;
                    padding:60px 120px 80px 120px;
                    -webkit-box-shadow: 2px 2px 3px rgba(0,0,0,0.1);
                    box-shadow: 2px 2px 3px rgba(0,0,0,0.1);
                  }
                }
                .label{
                  display:block;
                  position:relative;
                  margin:40px 0px;
                }
                .new-password-text, .confirm-password-text{
                  position:absolute;
                  top:-1.6em;
                  padding:10px;
                  font-family:sans-serif;
                  font-size:.8em;
                  letter-spacing:1px;
                  color:rgb(120,120,120);
                  transition:ease .3s;
                }
                #newPwd, #confirmPwd{
                  width:100%;
                  margin-top:20px;
                  padding:10px;
                  background:transparent;
                  border:none;
                  outline:none;
                }
                .box-line{
                  width:100%;
                  height:2px;
                  background:rgb(120,120,120);
                }
                #matchPasswords{
                  text-align:left;
                }
                input[type="submit"]{
                  inline-block;
                  padding:12px 24px;
                  background:rgb(360,360,360);
                  font-weight:bold;
                  color:#787878;
                  border:1px solid #787878;
                  outline:none;
                  border-radius:3px;
                  cursor:not-allowed;
                  transition:ease .3s;
                }
                </style>
              </head>
              <body>
              <p class="logo">ComuKol</p>
              <form action="/api/resetpassword" method="POST">
              <input type="hidden" name="id" value="${payload.id}" />
              <input type="hidden" name="token" value="${token}" />
              <label class="label">
              <p class="new-password-text" onfocus="this.style.top='-3em'" onfocusout="this.style.top='0'">New Password</p>
              <input id="newPwd" type="password" name="password"/>
              <div class="box-line">
              <div class="line"></div>
              </div>
              </label>
              <label class="label">
              <p class="confirm-password-text" onfocus="this.style.top='-3em'" onfocusout="this.style.top='0'">Confirm Password</p>
              <input id="confirmPwd" type="password" name="confirmPassword"/>
              <div class="box-line">
              <div class="line"></div>
              </div>
              </label>
              <p id="matchPasswords"></p>
              <input onMouseOver="this.style.color='#FFF';this.style.backgroundColor='#008000'" onMouseOut="this.style.color='#787878';this.style.backgroundColor='#FFFFFF'" type="submit" value="Reset Password" disabled/>
              </form>
              <script type="text/javascript">
              let passwordField = document.querySelectorAll('input[type="password"]')
              let boxLine = document.querySelectorAll('div.box-line')
              const matchPasswords = document.querySelector('#matchPasswords')
              const submitButton = document.querySelector('input[type="submit"]')
              passwordField[0].addEventListener('focus', ()=>{
                boxLine[0].style.transition='ease .5s'
                boxLine[0].style.backgroundColor='#FC6A03'
              })
              passwordField[0].addEventListener('focusout', ()=>{
                boxLine[0].style.transition='ease .3s'
                boxLine[0].style.backgroundColor='#787878'
              })
              passwordField[1].addEventListener('focus', ()=>{
                boxLine[1].style.transition='ease .5s'
                boxLine[1].style.backgroundColor='#FC6A03'
              })
              passwordField[1].addEventListener('focusout', ()=>{
                boxLine[1].style.transition='ease .3s'
                boxLine[1].style.backgroundColor='#787878'
              })
              passwordField[0].addEventListener('keyup', ()=>{
                if((passwordField[0].value.trim() === ''||passwordField[1].value.trim() === '') || (passwordField[0].value.trim() !== passwordField[1].value.trim())){
                  submitButton.setAttribute("disabled", "disabled")
                  submitButton.style.cursor='not-allowed'
                  matchPasswords.innerHTML='<small style="color:#FF0000">passwords do not match!</small>'
                }else{
                  matchPasswords.innerHTML='<small style="color:#008000">passwords match</small>'
                  submitButton.style.cursor='pointer'
                  submitButton.removeAttribute("disabled")
                }
              })
              passwordField[1].addEventListener('keyup', ()=>{
                if((passwordField[0].value.trim() === ''||passwordField[1].value.trim() === '') || passwordField[0].value.trim() !== passwordField[1].value.trim()){
                  submitButton.setAttribute("disabled", "disabled")
                  submitButton.style.cursor='not-allowed'
                  matchPasswords.innerHTML='<small style="color:#FF0000">passwords do not match!</small>'
                }else{
                  matchPasswords.innerHTML='<small style="color:#008000">passwords match</small>'
                  submitButton.style.cursor='pointer'
                  submitButton.removeAttribute("disabled")
                }
              })
              </script>
              </body>
            </html>`
          )
          }catch(err){
            res.status(400).json({'Error':'Invalid reset link'})
          }
        }else{
          //  Invalid reset link
          res.sendStatus(404).json({'Error':'Invalid reset link'})
        }
      }else{
        res.status(500).json(err)
      }
    })
  }else{
    res.status(400).json({'Error':'Missing required fields'})
  }
})

//  Required data : userId, token, password
//  Optional data : none
app.post('/api/resetpassword', (req, res)=>{
  const userId = typeof req.body.id == 'string' && req.body.id.trim().length == 12 ? req.body.id.trim() : false
  const token = typeof req.body.token == 'string' && req.body.token.trim().length > 0 ? req.body.token.trim() : false
  const newPassword = typeof req.body.password == 'string' && req.body.password.trim().length > 0 ? req.body.password.trim() : false
  if(userId && token){
    //  Look up the user
    run(`SELECT employee_id, email, password FROM users WHERE employee_id = "${userId}"`, (err, data)=>{
      if(!err){
        // showcase form for changing password
        if(data.result.length > 0){
          const secret = data.result[0].password
          try{
            jwt.decode(token, secret);
          }catch(err){
            res.status(400).json({'Error':'Expired reset form'})
          }
          run(`UPDATE users SET password = "${hash(newPassword)}" WHERE employee_id = "${userId}"`, (err, data)=>{
            if(!err && data.result.affectedRows > 0){
              res.sendStatus(200).json({'Info':'Password reset successfully'})
            }else{
              res.status(500).json({'Error':'Could not update the user'})
            }
          })
        }else{
          //  Invalid reset form
          res.sendStatus(404).json({'Error':'Invalid reset form'})
        }
      }else{
        res.status(500).json(err)
      }
    })
  }else{
    res.status(400).json({'Error':'Missing required fields'})
  }
})
/**
 * End of reset password
 */

//  @Users - delete
//  Required field : employee_id
app.delete("/api/users", (req, res)=>{
    //  Check that the employee_id provided is valid
    const employeeId = typeof req.query.id == 'string' && req.query.id.length == 12 ? req.query.id.trim() : false
    if(employeeId){
      //  Get the token from the headers
      const token = typeof req.headers.token == 'string' ? req.headers.token : false
      //  verify that the given token is valid for the email number
      verifyToken(token, employeeId, (tokenIsValid)=>{
        if(tokenIsValid){
          //  Look up the user
          run(`SELECT email FROM users where employee_id = "${employeeId}"`, (err, data)=>{
            if(!err){
              if(data.result.length > 0){
                run(`DELETE from users WHERE employee_id = "${employeeId}"`, (err, data)=>{
                  if(!err && data.result.affectedRows > 0){
                    res.sendStatus(200)
                  }else{
                    res.status(500).json({'Error':'Could not delete the specified user'})
                  }
                })
              }else{
                res.status(400).json({'Error':'Could not find the specified user'})
              }
            }else{
              res.status(500).json(err)
            }
          })
        }else{
          res.status(403).json({'Error':'Missing required token in header, or token is invalid'})
        }
      })
  
    }else{
      res.status(400).json({'Error':'Missing required field'})
    }
})

//  @process - post
//  Required data: process_id, start_time, employee_id
//  Optional data: none
app.post("/api/process", (req, res)=>{
  const processId = typeof req.body.id == 'string' && req.body.id.trim().length == 12 ? req.body.id.trim() : false
  const startTime = typeof req.body.start_time == 'string' && req.body.start_time.length > 0 ? req.body.start_time.trim() : false
  const employeeId = typeof req.body.employee_id == 'string' && req.body.employee_id.length == 12 ? req.body.employee_id.trim() : false
  
    if(processId && startTime && employeeId){
      //  Get the token from the headers
      const token = typeof req.headers.token == 'string' ? req.headers.token : false
      //  verify that the given token is valid for the employee_id
      verifyToken(token, employeeId, (tokenIsValid)=>{
        if(tokenIsValid){
          //  store values
          run(`INSERT INTO process (process_id, start_time, employee_id) VALUES ("${processId}", "${startTime}", "${employeeId}")`, (err, data)=>{
            if(!err && data.result.affectedRows > 0){
              res.sendStatus(201)
            }else{
              res.status(500).json({'Error':'failed to create process'})
            }
          })
        }else{
          res.status(403).json({'Error':'Missing required token in header, or token is invalid'})
        }
      })
    }else{
      res.status(400).json({'Error':'Missing required field(s)'})
    }
})

//  @process - get
//  Required data: id, employeeId
//  Optional data: none
app.get("/api/process/:userId/:id", (req, res)=>{
    const employeeId = typeof req.params.userId == 'string' && req.params.userId.length > 0 ? req.params.userId.trim() : false
    const processId = typeof req.params.id == 'string' && req.params.id.trim().length == 12 ? req.params.id.trim() : false
    if(processId && employeeId){
      const token = typeof req.headers.token == 'string' ? req.headers.token : false
      verifyToken(token, employeeId, (tokenIsValid)=>{
        if(tokenIsValid){
          run(`SELECT * FROM process WHERE process_id = "${processId}"`, (err, data)=>{
            if(!err){
              if(data.result.length > 0){
                res.status(200).json({...data.result[0]})
              }else{
                res.sendStatus(404)
              }
            }else{
              res.status(500).json(err)
            }
          })
        }else{
          res.status(403).json({'Error':'Missing required token in header, or token is invalid'})
        }
      })
    }else{
      console.log(processId, employeeId)
      res.status(400).json({'Error':'Missing required field'})
    }
})

// @process - put
//  Required data: end_time, process_id
//  Optional data: none
app.put("/api/process", (req, res)=>{
  const employeeId = typeof req.body.user_id == 'string' && req.body.user_id.length > 0 ? req.body.user_id.trim() : false
  const processId = typeof req.body.id == 'string' && req.body.id.trim().length == 12 ? req.body.id.trim() : false
  const endTime = typeof req.body.end_time == 'string' && req.body.end_time.length > 0 ? req.body.end_time.trim() : false
  if(employeeId && processId && endTime){
    const token = typeof req.headers.token == 'string' ? req.headers.token : false
    verifyToken(token, employeeId, (tokenIsValid)=>{
      if(tokenIsValid){
        let startTime, elapseTime;
        //  Get the start_time
        run(`SELECT start_time FROM process WHERE process_id = "${processId}"`, (err, data)=>{
          if(!err){
            if(data.result.length > 0){
              startTime = data.result[0].start_time
              //  Calculate elapse_time
              elapseTime = (new Date(endTime) - new Date(startTime)) //milliseconds
              //  Convert to Days:Hours:Minutes:Seconds string
              elapseTime = msToTime(elapseTime)
              run(`UPDATE process SET end_time = "${endTime}", elapse_time = "${elapseTime}" WHERE process_id = "${processId}"`, (err, data)=>{
                if(!err && data.result.affectedRows > 0){
                  res.sendStatus(200)
                }else{
                  res.status(500).json({'Error':'Could not update the end_time'})
                }
              })
            }else{
              res.sendStatus(404)
            }
          }else{
            res.status(500).json(err)
          }
        })
      }else{
        res.status(403).json({'Error':'Missing required token in header, or token is invalid'})
      }
    })
  }else{
    res.status(400).json({'Error':'Missing required field'})
  }
})

//  @teadata - post
//  Required data: process_id, red, green, blue, temperature, humidity, image_url
//  Optional data: none
app.post("/api/teadata", upload.single('image'), (req, res)=>{
  const processId = typeof req.body.id == 'string' && req.body.id.trim().length == 12 ? req.body.id.trim() : false
  const red = typeof req.body.red != 'undefined' && typeof (req.body.red * 1) == 'number' && (req.body.red * 1) >= 0 && (req.body.red * 1) <= 255 ? req.body.red : false
  const green = typeof req.body.green != 'undefined' && typeof (req.body.green * 1) == 'number' && (req.body.green * 1) >= 0 && (req.body.green * 1) <= 255 ? req.body.green : false
  const blue = typeof req.body.blue != 'undefined' && typeof (req.body.blue * 1) == 'number' && (req.body.blue * 1) >= 0 && (req.body.blue * 1) <= 255 ? req.body.blue : false
  const temperature = typeof req.body.temperature != 'undefined' && typeof (req.body.temperature * 1) == 'number' ? req.body.temperature : false
  const humidity = typeof req.body.humidity != 'undefined' && typeof (req.body.humidity * 1) == 'number' ? req.body.humidity : false
  const image = typeof req.file.path == 'string' && req.file.path.trim().length > 0 ? req.file.path.trim().split('\\').pop() : false
  if(processId && red && green && blue && temperature && humidity && image){
      run(`INSERT INTO teadata (process_id, red, green, blue, temperature, humidity, image) VALUES ("${processId}", "${red}", "${green}", "${blue}", "${temperature}", "${humidity}", "${image}")`, (err, data)=>{
        if(!err && data.result.affectedRows > 0){
          res.sendStatus(201)
        }else{
          res.status(500).json({'Error':'failed to create teadata'})
        }
      })
  }else{
    res.status(400).json({'Error' : 'Missing required field(s)'})
  }
})

//  @teadata - get
//  Required data: id
//  Optional data: none
// app.get("/api/teadata/:id", (req, res)=>{
//   const processId = typeof req.params.id != 'undefined' && typeof(req.params.id * 1) == 'number' ? req.params.id : false
//   if(processId){
//     run(`SELECT * FROM teadata WHERE process_id = "${processId}"`, (err, data)=>{
//       if(!err){
//         if(data.result.length > 0){
//           res.status(200).json({...data.result[0]})
//         }else{
//           res.sendStatus(404)
//         }
//       }else{
//         res.status(500).json(err)
//       }
//     })
//   }else{
//     res.status(400).json({'Error' : 'Missing required field(s)'})
//   }
// })

//  @teadata - get
//  Required data: none
//  Optional data: none
app.get("/api/teadata/", (req, res)=>{
  //  Get the latest data (count: 1)
  run(`SELECT * FROM teadata ORDER BY id DESC LIMIT 1`, (err, data)=>{
    if(!err){
      if(data.result.length > 0){
        res.status(200).json({...data.result[0]})
      }else{
        res.sendStatus(404)
      }
    }else{
      res.status(500).json(err)
    }
  })
})

//  @teadata - get
//  Required data: count
//  Optional data: none
app.get("/api/teadata/:count", (req, res)=>{
  const count = typeof(req.params.count*=1) == 'number' ? req.params.count*=1 : false
  if(count){
    //  Get the latest data (count: 1)
    run(`SELECT * FROM teadata ORDER BY id DESC LIMIT ${count}`, (err, data)=>{
      if(!err){
        if(data.result.length > 0){
          res.status(200).json([...data.result])
        }else{
          res.sendStatus(404)
        }
      }else{
        res.status(500).json(err)
      }
    })
  }else{
    res.status(400).json({'Error':'Missing required field'})
  }
})

//  @tokens - post
//  Required data: email, password
//  Optional data: none
app.post("/api/tokens", (req, res)=>{
  const email = typeof req.body.email == 'string' && req.body.email.trim().length > 0 ? req.body.email.trim() : false
  const password = typeof req.body.password == 'string' && req.body.password.trim().length > 0 ? req.body.password.trim() : false
  if(email && password){
    //  Lookup the user who matches that email
    run(`SELECT employee_id, password, status FROM users WHERE email = "${email}" AND password = "${hash(password)}"`, (err, data)=>{
      if(!err){
        if(data.result.length != 0 && data.result[0].status){
          //  If there is a match, create a new token with a random name. Set expiration data 1 hour in the future
          const tokenId = createRandomString(20)
          const expires = Date.now() + 1000 * 60 * 60 //milliseconds
          const tokenObject = {
            id : tokenId,
            employeeId : data.result[0].employee_id,
            expires : expires
          }
          //  Store the token
          run(`INSERT INTO tokens (id, employee_id, expires) VALUES("${tokenObject.id}", "${tokenObject.employeeId}", "${tokenObject.expires}")`, (err, data)=>{
            if(!err && data.result.affectedRows > 0){
              res.status(201).json(tokenObject)
            }else{
              res.status(500).json({'Error':'Could not create the new token'})
            }
          })
        }else{
          res.status(400).json({'Error':'User does not exist or is inactive'})
        }
      }else{
        res.status(500).json(err)
      }
    })

  }else{
    res.status(400).json({'Error':'Missing required field(s)'})
  }
})

//  @tokens - get
//  Required data : id
//  Optional data : none
app.get("/api/tokens/:id", (req, res)=>{
    //  Check that the id is valid
    const id = typeof req.params.id == 'string' && req.params.id.trim().length == 20 ? req.params.id.trim() : false
    if(id){
      //  Look up the token
      run(`SELECT * FROM tokens WHERE id="${id}"`, (err, data)=>{
        if(!err){
          if(data.result.length > 0){
            res.status(200).json({...data.result[0]})
          }else{
            res.sendStatus(404)
          }
        }else{
          res.status(500).json(err)
        }
      })
    }else{
      res.status(400).json({'Error':'Missing required field'})
    }
})

//  @tokens - put
//  Required data : id, extend
//  Optional data : none
app.put("/api/tokens", (req, res)=>{
    const id = typeof req.body.id == 'string' && req.body.id.trim().length == 20 ? req.body.id.trim() : false
    const extend = typeof req.body.extend == 'boolean' && req.body.extend == true ? true : false
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
                  res.sendStatus(200)
                }else{
                  res.status(500).json(err)
                }
              })
            }else{
              res.status(400).json({'Error':'The token has already expired, and cannot be extended'})
            }
          }else{
            res.status(400).json({'Error':'Specified token does not exist'})
          }
        }else{
          res.status(500).json(err)
        }
      })
  
    }else{
      res.status(400).json({'Error':'Missing required field(s) or field(s) are invalid'})
    }
})

//  @tokens - delete
//  Required data: id
//  Optional data: none
app.delete("/api/tokens", (req, res)=>{
    //  Check that the id is valid
    const id = typeof req.query.id == 'string' && req.query.id.trim().length == 20 ? req.query.id.trim() : false
  
    if(id){
      //  Look up the token
      run(`SELECT * FROM tokens WHERE id="${id}"`, (err, data)=>{
        if(!err){
          if(data.result.length > 0){
            run(`DELETE FROM tokens WHERE id="${id}"`, (err, data)=>{
              if(!err && data.result){
                res.sendStatus(200)
              }else{
                res.status(500).json({'Error':'Could not delete the specified token'})
              }
            })
          }else{
            res.status(500).json({'Error':'Could not find the specified token'})
          }
        }else{
          res.status(500).json(err)
        }
      })
  
    }else{
      res.status(400).json({'Error':'Missing required field'})
    }
})


//  Verify if a given token id is currently valid for a given user
const verifyToken = (id, employee_id, callback)=>{
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
app.get("/api/ping", (req, res)=>{
    res.sendStatus(200)
})

//  @notFound handler
app.use((req, res, next)=>{
    res.sendStatus(404)
})

const server = {}

server.init = ()=>{
    const listening = app.listen(config.httpPort||3000, ()=>{
        console.log('\x1b[35m%s\x1b[0m',`Listening on port: ${listening.address().port}`)
    })
}

module.exports = server
