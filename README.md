# Web application with registration/login and booking functionalities

## Vunerable and patched versions

Vunerable (and unstructured version) is available on `main` branch. Patched and more modular version is on `fixed-issues` branch.

## How to use

In order to register, fill in username and password fields. You can use these credentials to login later.

## How to run

Run html version:

`npm i && node server.js`

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
