/*
*   Dependencies
*/
const config = require('./config')
const mailgun = require("mailgun-js")({apiKey: config.mailgun.apiKey, domain: config.mailgun.domain})

//  Container for all methods
const mail = {}
mail.send = (agendum, to, link, callback)=>{
    let data;
    if(agendum == 'emailConfirmation'){
        data = {
            from: `${config.appName} <${config.mailgun.email}>`,
            to: to,
            subject: 'Email confirmation',
            template: 'email_confirmation',
            'v:appName': config.appName,
            'v:redirectUrl': link
        }
    }else if(agendum == 'passwordReset'){
        data = {
            from: `${config.appName} <${config.mailgun.email}>`,
            to: to,
            subject: 'Password reset',
            template: 'password_recovery',
            'v:appName': config.appName,
            'v:resetLink': link
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