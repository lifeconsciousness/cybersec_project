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

## OWASP top 10 vunerabilities present in initial version 

1.Bypassing access control checks by modifying the URL (parameter tampering or force browsing), internal application state, or the HTML page, or by using an attack tool modifying API requests.
2.Identification and Authentication Failures:

Permits brute force or other automated attacks.

Permits default, weak, or well-known passwords, such as "Password1" or "admin/admin".

3.Security Logging and Monitoring Failures
4.Cryptographic Failures:

store data as plain text first, then fix it somehow

5.Insecure design:

Scenario #2: A cinema chain allows group booking discounts and has a maximum of fifteen attendees before requiring a deposit. Attackers could threat model this flow and test if they could book six hundred seats and all cinemas at once in a few requests, causing a massive loss of income.



#### Credits

Login page is based on [this form](https://codepen.io/marko-zub/pen/mzPeOV)
