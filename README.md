# Sisibotea

## Email confirmation (sign up)
Sending emails through mailgun sandbox
Requirements: whitelisting of recipient emails
*Implications* 
* You'll need to send me valid emails that you'll use for auth testing so that the backend dev can whitelist them
* Confirm receiving emails from the sandbox from the email inbox

## Password reset (forgot password)
The aforementioned also applies here
*Other details*
Use of Jsonwebtokens to generate one time password reset links sent via email


## Config file format (config.example.js)

## Mailgun account
We need to sort out a way to gain access to one mailgun account or a way of using credentials of one account without exposing them.

## mysql file schema
Several changes have been made some of which need approval from the DB Designer. The schema has been pushed in the root of solvitlabs/sisibotea in the following folder: /database/
Just import that file on mysql.

## endpoints documentation
Pending creation
