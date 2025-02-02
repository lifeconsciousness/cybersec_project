# Simple registration/login page

## How to use

In order to register, fill in username and password fields. You can use these credentials to login later.

## How to run

Run html version:

`cd backend && node server.js`

The react version is still in development so it won't work yet:

`cd backend && node server.js` and `cd frontend && npm start`

## Vunerabilities

With username: `admin' --` and anything in password, attacker can enter anyone's account.

Same for password: `' OR '1'='1' -- ` and any username.


#### Credits

Login page is based on [this form](https://codepen.io/marko-zub/pen/mzPeOV)
