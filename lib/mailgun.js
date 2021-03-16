/*
*   Dependencies
*/
const config = require('./config')
const mailgun = require("mailgun-js")({apiKey: config.mailgun.apiKey, domain: config.mailgun.domain})

//  Container for all methods
const mail = {}
mail.send = (agendum, to, msg, callback)=>{
    let data;
    if(agendum == 'emailConfirmation'){
        data = {
            from: `sisibotea <${config.mailgun.email}>`,
            to: to,
            subject: 'Email confirmation',
            text: msg
        }
    }else if(agendum == 'passwordReset'){
        data = {
            from: `sisibotea <${config.mailgun.email}>`,
            to: to,
            subject: 'Password reset',
            text: msg    
        }
    }else{
        callback(err, false)
    }
    mailgun.messages().send(data, (err, body)=>{
        if(!err && body){
            callback(false, body);
        }else{
            callback(err, false)
        }
    })
}

module.exports = mail