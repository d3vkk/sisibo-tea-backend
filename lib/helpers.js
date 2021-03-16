/*
 *  Helpers for various tasks
 *
 */

//  Dependencies
const crypto = require('crypto')
const config = require('./config')
const https = require('https')
const querystring = require('querystring')

//  Container for all the helpers
let helpers = {}

//  Create a SHA256 hash
helpers.hash = (str)=>{
  if(typeof str == 'string' && str.length > 0){
    let hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex')
    return hash
  }else{
    return false
  }
}

//  Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = (str)=>{
  try{
    const obj = JSON.parse(str)
    return obj
  }catch(e){
    return {}
  }
}

//  Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = (strLength)=>{
  strLength = typeof strLength == 'number' && strLength > 0 ? strLength : false
  if(strLength){
    //  Define all the possible characters that could go into a string
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'

    //  Start the final string
    let str = ''
    for(i=1; i<=strLength; i++){
      //  Get a random character from the possibleCharacters string
      let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
      //  Append this character to the final string
      str += randomCharacter
    }

    //  Return the final string
    return str
  }else{
    return false
  }
}


//  Send an SMS message via Twilio
helpers.sendTwilioSms = (phone, msg, callback)=>{
  //  Validate parameters
  phone = typeof phone == 'string' && phone.trim().length == 10 ? phone.trim() : false
  msg = typeof msg == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false
  if(phone && msg){
    //  Configure the request payload
    const payload = {
      'From' : config.twilio.fromPhone,
      'To'   : '+254' + phone,
      'Body' : msg
    }

    //  Stringify the payload
    let stringPayload = querystring.stringify(payload)

    //  Configure the request details
    let requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.twilio.com',
      'method'   : 'POST',
      'path'     : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
      'auth'     : config.twilio.accountSid+':'+config.twilio.authToken,
      'headers'  : {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length' : Buffer.byteLength(stringPayload)
      }
    }

    //Instantiate the request object
    const req = https.request(requestDetails, (res)=>{
      //  Grab the status of the sent request
      const status = res.statusCode
      //  Callback successfully if the request went through
      if(status == 200 || status == 201){
        callback(false)
      }else{
        callback('Status code returned was '+status)
      }
    })

    //  Bind to the error event so it doesn't get thrown
    req.on('error', e=>{
      callback(e)
    })

    //  Add the payload
    req.write(stringPayload)

    //  End the request
    req.end()
  }else{
    callback('Given parameters were missing or invalid')
  }
}

/*
 * Converting milliseconds to days:hours:minutes:seconds
 */
helpers.msToTime = (duration)=>{
  //  duration in milliseconds
  let time = '';
  let d = duration / (60 * 60 * 1000 * 24)
  //days
  time += `${Math.floor(d)}:`
 
  let h = '0.'+`${d}`.split('.')[1]
  h*=24
  //hours
  time += `${Math.floor(h)}:`
 
  let m = '0.'+`${h}`.split('.')[1]
  m*=60
  //minutes
  time += `${Math.floor(m)}:`
 
  let s = '0.'+`${m}`.split('.')[1]
  s*=60
  //seconds
  time += `${Math.floor(s)}`
 
  return time
}

//  Export the module
module.exports = helpers
