# Setup

To setup for this website, MongoDB needs to be installed so that the `mongod`
command is available. For mac you can use this link to help installation: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/

# Running the app

To run the website, first move to root directory of this site, then in one
shell window, run the database with:

```bash
mongod --dbpath "${PWD}/database"
```

In another shell window run:

```
npm install
npm run start
```

At this point, it should show "The database connection has been established."
Then the site can be used as normal at `localhost:8088`.

## Admin Logins

The different admin logins are below:

```js
const adminAccounts = {
  test: "test",
  instructor: "pass",
  "Dr.M": "pass",
  anton: "pass",
  student: "somePassword"
};
```
