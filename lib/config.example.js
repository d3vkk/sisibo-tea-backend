/*
 * Create and export configurtion variables
 */

// Container for all the environments
let environments = {}

// Staging (default) environment
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: '',
  twilio: {
    accountSid: '',
    authToken: '',
    fromPhone: ''
  },
  database: {
    name: 'sisibotea',
    host: 'localhost',
    user: '',
    password: ''
  },
  mailgun:{
    apiKey:'5462d4646b440b734786b8560dd4efd3-6e0fd3a4-50627d19',
    domain:'sandbox3d92448f945b4be4ad7c99420feb6728.mailgun.org',
    email:'postmaster@sandbox3d92448f945b4be4ad7c99420feb6728.mailgun.org'
  },
  twilio:{
    accountSid : '',
    authToken : '',
    fromPhone : '',
    to: ''
  },
  fermentedValues:{
    red:'149',
    green:'4',
    blue:'117'
  }
}

//Production environment
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: '',
  twilio: {
    accountSid: '',
    authToken: '',
    fromPhone: ''
  },
  database: {
    name: 'sisibotea',
    host: 'localhost',
    user: '',
    password: ''
  },
  mailgun:{
    apiKey:'5462d4646b440b734786b8560dd4efd3-6e0fd3a4-50627d19',
    domain:'sandbox3d92448f945b4be4ad7c99420feb6728.mailgun.org',
    email:'postmaster@sandbox3d92448f945b4be4ad7c99420feb6728.mailgun.org'
  },
  twilio:{
    accountSid : '',
    authToken : '',
    fromPhone : '',
    to: ''
  },
  fermentedValues:{
    red:'149',
    green:'4',
    blue:'117'
  }
}

// Determine which environment was passed as a command-line argument
let currentEnvironment = typeof process.env.NODE_ENV == 'string' ? process.env.NODE_ENV.toLowerCase() : ''

// Check that the current environment is one of the environments above, if not default to staging
let environmentToExport = typeof environments[currentEnvironment] == 'object' ? environments[currentEnvironment] : environments.staging

//  Export the module
module.exports = environmentToExport
