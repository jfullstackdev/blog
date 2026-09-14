---
title: "Authentication Patterns: Tokens, Sessions, and Request Signing"
date: 2026-09-15
slug: auth-patterns
description: "these are some authentication approaches I have encountered in both personal and professional work, so I wanted to document them"
topics: [security]
---

# Authentication Patterns: Tokens, Sessions, and Request Signing

These are some authentication approaches I have encountered in both
personal and professional work, so I wanted to document them.

This is **not intended to be a step-by-step tutorial** or a complete guide
to authentication. It is more of a collection of approaches, along with
some observations about where they are commonly used, why they might be
chosen, and their advantages and disadvantages.

Some examples are specific to technologies or services I have worked with,
so they should not necessarily be treated as guaranteed or universal
implementations.

---

## 1. Bearer Tokens

This is probably the authentication mechanism I have encountered the most
so far.

The basic idea is fairly simple: the client obtains a token and sends it
with each request, usually through the `Authorization` header:

```http
Authorization: Bearer <token>
```

The server then validates the token and determines whether the request is
allowed.

Bearer tokens are extremely common in APIs. Even GitHub's API, for example,
supports tokens for authentication.

There are different ways these tokens can be issued and managed, though,
and this is where the implementations start to differ.

---

### User-Managed Tokens

This is where the user themselves creates a token
and determines what permissions that token should have.

A good example is a GitHub Personal Access Token.

The user can go into the GitHub settings, create a token, and select the
permissions or scopes associated with that token.

The model is essentially:

```text
User
  ↓
Creates Token
  ↓
Selects Permissions
  ↓
Uses Token with API
```

This makes a lot of sense for developer-facing APIs because the person
using the API is usually technical enough to understand concepts like:

* scopes
* permissions
* expiration
* token rotation
* API access

The token is also usually treated as a credential. Whoever possesses the
token can potentially use it, hence the term **bearer token**.

The server generally does not care who physically holds the token. It cares
that the token is valid.

---

### Application-Managed Authorization

Another variation is where the user is not expected to understand or
configure technical permissions themselves.

In this case, **the user is the client**, rather than another developer
integrating with the API.

For example, imagine an application with:

```text
Admin
 ├── Users
 ├── Roles
 └── Permissions
```

Instead of asking the customer to manually create a token and select
technical scopes, we provide a UI where an administrator can define roles.

For example:

```text
Administrator
    ├── Users: Read
    ├── Users: Create
    ├── Users: Update
    ├── Users: Delete
    └── Reports: Read

Manager
    ├── Users: Read
    └── Reports: Read
```

The application then determines what the authenticated user is allowed to
do.

This is where **RBAC (Role-Based Access Control)** comes into the picture.

The important distinction here is:

> Authentication answers "Who are you?"

> Authorization answers "What are you allowed to do?"

A bearer token can authenticate the user, while RBAC determines what that
authenticated user can access.

For Bearer + RBAC, the approach is Cognito + DB as an example.

Cognito answers "who is this and roughly what they are"
(identity + role claim), while your DB answers "what exactly
may they do right now" (live, relational, auditable).

---

### Advantages

* very simple API authentication model
* easy to implement
* widely supported
* works well for scripts, CLI tools, integrations, and developer
  applications
* easy to attach scopes or permissions
* does not require the server to maintain a session for every request

---

### Disadvantages

* a stolen token can potentially be used by whoever possesses it
* token rotation and revocation need to be handled properly
* tokens need to be stored securely
* long-lived tokens increase the impact of credential theft
* users may accidentally expose tokens in source code, logs, or
  configuration

Overall, bearer tokens are a good default for many API scenarios
because they are simple and widely supported. The tradeoff is that the
security of the credential is heavily dependent on protecting the token.

Things such as:

* short expiration times
* refresh tokens
* token rotation
* scopes
* secure storage
* revocation
* HTTPS

become important parts of the overall design.

As a side note, I find it hard to grasp what's the idea
of a refresh token.

What I missed is that, if an attacker gets it somehow,
they can now use it as a legitimate user. With a refresh
token, the access token can have a short lifetime, so the time
and damage they can do is more limited. Of course, they
may still find ways to exploit it, but that's out of
scope here. I just wanted to emphasize the part of the
concept that was difficult for me to grasp.

---

## 2. Request Signing

This is something I commonly associate with financial APIs, exchanges, and
other systems where API access can perform sensitive operations.

For example, some cryptocurrency exchanges provide APIs that allow users to
build trading applications or bots.

Instead of simply sending:

```http
Authorization: Bearer <token>
```

the client can be required to generate a cryptographic signature for the
request.

Conceptually:

```text
Request
   +
Timestamp
   +
Nonce
   +
Secret
   ↓
Signature
```

The server can then verify that signature using the corresponding secret or
public key, depending on the signing mechanism.

The exact implementation varies between APIs.

Also, it can authenticate a client/application/key holder,
not just human or user.

Some use HMAC-based signatures, while others use asymmetric cryptography.

### Exchange Example

So the gist is, you get the key and secret pair. Then the key is
just an index. It points to a row in the database. That row
holds two things: the secret and the permissions.

When a request comes in, the system fetches the row using the key, uses
the stored secret to verify your signature (it computes the same HMAC
and compares: match means it's really you), then checks the row's permission
flags against what the endpoint requires. The secret never leaves that row.
And the key by itself? It just tells the server "go find row 7", useless
to anyone who doesn't hold the secret that proves they're allowed to ask.

On your machine:

1. Build the params dict. {"symbol": ..., "side": ..., "quantity": ...,
   "price": ..., "timestamp": ...} — every piece of business meaning in the
   request, plus a timestamp captured at this moment.
2. Append the API key to a header. The key is just the identifier; it's
   safe to send.
3. Serialize params to a canonical string. Flat, alphabetically sorted,
   &-joined: price=398&quantity=10.05&side=BUY&.... This rule is fixed by
   the API's docs — every client must build it identically.
4. Compute the signature. HMAC-SHA256(secret, canonical_string) →
   64-character hex digest. This is the part the secret actually touches.
5. Append signature=<digest> to the params. Now the request URL has
   everything: meaning + freshness + proof.
6. Send over HTTPS. Server receives key header + URL with all params +
   signature, all readable on the wire.

so it looks like:

```
POST https://api.example.com/v1/order?price=398&quantity=10.05&recvWindow=5000&side=BUY&symbol=UNIPHP&timestamp=1787123456789&type=LIMIT&signature=7a5f2c0e91b8d4a3f6e0c2b19d8a4473e5c6b0d9f8a2134e7b6c5d4e3f2a1b0c9

X-API-KEY: 3aF9k2Lm7XpQ4wN8vB1cD6sJ0hR5tYU2iO9eP3gK7zA4qM1nW6bE
```

On the exchange's server:

7. Pull the key from the header. key = "3aF9k2Lm..." — just identifies which
   row to read.
8. Look up the row. One database read; from that row it has the stored
   secret and the permission flags (Read/Trade/Withdraw toggles).
9. Reconstruct the canonical string from the URL's params (minus
   signature), using the same sort-and-join rule.
10. Recompute the HMAC. HMAC-SHA256(stored_secret,
    reconstructed_string) → server's own digest.
11. Compare. The two digests must match byte-for-byte. If they don't →
    reject (could be tampering, wrong key, clock skew — doesn't matter, same
    answer: no).
12. If valid, check permissions. The endpoint you're hitting is tagged
    "needs Trade"; the key's row says trade = true; pass → process the order.
    If trade = false → reject with permission error, even though the
    signature was perfectly valid.

Then the order reaches the matching engine, fills or doesn't, the response
comes back, and the cycle ends.

---

### Why Request Signing?

At first glance, it might seem like request signing is simply "a more
secure bearer token."

I think the more useful way to look at it is that it provides a different
security property.

With a basic bearer token:

```text
Possession of token
        ↓
Can make request
```

With request signing:

```text
Possession of the secret
        ↓
Ability to produce a valid signature for the request
        ↓
Valid request
```

The signature can also be based on information about the request itself.

For example:

```text
HTTP Method
+
Path
+
Timestamp
+
Request Body
        ↓
Signature
```

This means the signature can prove that the client possessed the secret
when constructing that particular request.

Depending on the implementation, this can also help protect against request
tampering and replay attacks.

However, **request signing by itself does not automatically provide replay
protection**. The protocol needs additional mechanisms, such as timestamps,
nonces, request IDs, or expiration windows, and the server needs to actually
validate those values.

So the useful distinction for me is:

```text
Request Signing
      ↓
Request authenticity / integrity
      +
Replay Protection Mechanisms
      ↓
Stronger protection against replay
```

The exact security properties depend on how the signing protocol is
designed and implemented.

---

### Replay Protection

So, as mentioned above, one particularly interesting part of 
request signing is replay protection.

Imagine an attacker somehow captures this request:

```text
POST /api/withdraw

amount=1000
```

If the authentication mechanism is simply a bearer token, the attacker
might be able to resend the same request.

With request signing, the API can require things such as:

* timestamp
* nonce
* request ID
* expiration window

The server can then reject requests that are too old or have already been
processed.

For example:

```text
Timestamp: 1750000000
Nonce: abc123
Signature: xyz...
```

The server can check:

```text
Is timestamp recent?
        ↓
Has nonce already been used?
        ↓
Does signature match?
        ↓
Is the request otherwise authorized?
```

This makes the authentication scheme considerably more involved, but also
potentially more resistant to replay.

The important part is that the server must actually enforce these replay
protections. A signed request that is valid indefinitely could still
potentially be replayed.

---

### IP Whitelisting

Some systems combine request signing with **IP whitelisting**.

The API credentials might only be accepted when the request comes from a
previously configured IP address.

Conceptually:

```text
Valid Credentials
        +
Valid Signature
        +
Approved IP
        ↓
Request Accepted
```

This adds another layer of restriction.

Even if someone obtains the API credentials, they may not be able to use
them from an arbitrary location.

Of course, IP whitelisting is not authentication by itself. It is better
thought of as an additional network-level security control.

I encountered this problem even more while developing my Trade Helper 
for Coins.ph, since they only accept IPv6 and not IPv4. Because of that, 
a lot of requests can fail, and I need to adjust the code to make 
the requests work properly. But that's also part of the premise 
of being more secure.

---

### Advantages

* stronger request integrity
* can provide protection against request tampering
* can provide replay protection when implemented correctly
* useful for server-to-server communication
* well suited to high-value or sensitive operations
* credentials can be tied to a specific request
* can be combined with additional controls such as IP allowlisting

### Disadvantages

The biggest disadvantage, in my opinion, is complexity.

Compared with:

```http
Authorization: Bearer <token>
```

you now have to worry about:

* canonicalizing requests
* generating signatures
* timestamps
* nonces
* clock synchronization
* hashing
* secret management
* replay protection
* signature verification
* debugging failed signatures

A small difference in how the request is constructed can potentially result
in a completely different signature. As mentioned above, this is also one of the
problems I had to deal with when I was developing the
Trade Helper using the API of Coins.ph.

This makes request signing more difficult to implement and troubleshoot.

It is also less convenient for browser-based applications because exposing
long-lived signing secrets to frontend JavaScript would defeat much of the
security model.

---

## 3. Session-Based Authentication

This is something that is commonly provided by full-stack web frameworks.
Laravel is a good example.

In a traditional session-based application, the server authenticates the
user and creates a session. The browser then receives a session cookie.

Conceptually:

```text
Browser
   ↓
Login
   ↓
Laravel
   ↓
Creates Session
   ↓
Session Cookie
   ↓
Browser
```

For subsequent requests:

```text
Browser
   ↓
Session Cookie
   ↓
Laravel
   ↓
Validate Session
   ↓
Authenticated User
```

The client does not necessarily need to manage an API access token itself.

Instead, the browser maintains the session through cookies.

---

### Laravel Sanctum

For example, imagine:

```text
React Frontend
       ↓
     HTTP
       ↓
Laravel Backend
       ↓
    Sanctum
       ↓
Authenticated User
```

For a first-party SPA, Sanctum can provide a convenient authentication
mechanism based around cookies and Laravel's authentication system.

This is somewhat different from the architecture where a frontend receives
a JWT from something like an external identity provider and then sends that
token to an API. Note also, I used JWT as the example of Bearer token but it
can be any opaque random token.

The important thing is not that one approach is universally better.

They solve slightly different problems and have different tradeoffs.

---

### Session vs Token

A simplified comparison would be:

#### Session

```text
Browser
   ↓
Session Cookie
   ↓
Server
   ↓
Session State
```

#### Bearer Token

```text
Client
   ↓
Bearer Token
   ↓
API
   ↓
Validate Token
```

The main difference is **where the authentication state lives**. With sessions,
the browser holds a session identifier while the server maintains the session
state. With a self-contained token such as a JWT, the token can carry claims
that the server validates without retrieving session state.

This is why JWTs are often described as "stateless." It can reduce dependence
on a centralized session store, but can also make revocation and immediate
permission changes more complicated. Sessions, on the other hand, make
server-side invalidation straightforward because the server controls the
session state.

As a rough heuristic:

* **Session:** browser-only, first-party web application, one backend owns
  the login.
* **Bearer:** multiple clients, multiple APIs, a central identity provider,
  or third-party integrations.

This is not a hard rule. The right choice depends on the application's
architecture and security requirements.

---

### Advantages

* very natural for browser applications
* cookies are well supported by browsers
* `HttpOnly` cookies can prevent JavaScript from directly reading the
  credential
* easy to invalidate sessions server-side
* mature security model
* convenient for traditional full-stack applications
* good integration with server-side frameworks

### Disadvantages

* server-side session state needs to be managed
* scaling may require shared session storage
* cross-origin frontend/backend setups can introduce additional complexity
* CSRF needs to be considered
* less convenient for third-party API consumers
* session expiration and invalidation need to be designed carefully

---

## Authentication vs Authorization

As we know, authentication is just the first step in security.
There is also authorization for more fine-grained control. I had
already mentioned it above so many times, so it's worth having 
a dedicated section for this.

Authentication is:

> Who is this?

Authorization is:

> What can this person or application do?

For example:

```text
Authentication
      ↓
"This is John."
      ↓
Authorization
      ↓
"John is an Administrator."
      ↓
Permissions
      ↓
"John can delete users."
```

A bearer token can be used for authentication.
A session can be used for authentication.
Request signing can be used to authenticate a machine or application.

But all of them can still have an authorization layer on top.

This is where concepts such as:

* RBAC
* scopes
* permissions
* policies
* resource ownership

come into play.

---

## How I Think About Choosing Between Them

What problem are we trying to solve, and what is the threat model?

A rough mental model for me would be:

| Pattern         | Typical Use                                 | Main Strength                                   | Main Tradeoff                                 |
| --------------- | ------------------------------------------- | ----------------------------------------------- | --------------------------------------------- |
| Bearer Token    | APIs, integrations, developer platforms     | Simple and widely supported                     | Token theft/replay                            |
| Request Signing | Financial APIs, exchanges, server-to-server | Request integrity and stronger credential proof | Complexity                                    |
| Session         | Browser / first-party web applications      | Excellent browser integration                   | Stateful architecture and CSRF considerations |

For example:

### Public Developer API

A bearer token or OAuth-style access token is often a natural choice.

Developers need something straightforward that they can use from different
applications, scripts, and services.

### First-Party Web Application

A session-based approach can be very convenient.

The browser already has a mature cookie mechanism, and server-side session
management can make authentication and logout straightforward.

### Sensitive server-to-server API

Request signing can make more sense when the operations are highly
sensitive and request integrity or replay protection is important.

### Application with Many Different User Roles

Regardless of which authentication mechanism is chosen, an authorization
system such as RBAC may be needed.

For example:

```text
Authentication
      ↓
Who are you?
      ↓
Authorization
      ↓
What role do you have?
      ↓
What permissions does that role have?
      ↓
Can you perform this action?
```

---

## Final Thought

The main thing I have taken away for authentication is that
authentication is not really about picking one technology.

A system might use several of these patterns at the same time.

For example:

```text
User
 ↓
Session / Identity Provider
 ↓
Authentication
 ↓
JWT / Session
 ↓
RBAC
 ↓
Permissions
 ↓
API
```

while a separate machine-to-machine integration might use:

```text
Service
 ↓
API Credentials
 ↓
Request Signing
 ↓
IP Allowlist
 ↓
API
```

So rather than thinking:

> "Should I use JWT, sessions, or request signing?"

I think the better question is:

> **Who is calling the system, what are they trying to access, what could
> go wrong if the credential is stolen, and what security properties does the
> application actually need?**
