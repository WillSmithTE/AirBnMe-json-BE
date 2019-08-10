const fs = require('fs')
const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const jwt = require('jsonwebtoken')

const server = jsonServer.create()
const router = jsonServer.router('./database.json')

const USERS_FILE_PATH = './users.json';
const DB_FILE_PATH = './db.json';
const JSON_DATA_FORMAT = 'UTF-8';

const ERROR_CODE = 401;

server.use(jsonServer.defaults(), jsonServer.bodyParser);

const SECRET_KEY = '9707500312';

const expiresIn = '365d';

function setResError(res, message) {
  res.status(ERROR_CODE).json({ 'status': ERROR_CODE, message });
}

function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn })
}

function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY);
}

function userIdOrUndefined(email, password) {
  const maybeUser = getUser(email, userdb);
  return maybeUser !== undefined && maybeUser.password === password ?
    maybeUser.id : undefined;
}

function getUser(email, userdb) {

  const maybeUserIndex = userdb.users.findIndex((user) => user.email === email);
  return maybeUserIndex === -1 ? undefined : userdb.users[maybeUserIndex];
}

function sortByReview(listings) {
  return listings.sort((a, b) => b.score - a.score);
}

function skipTakeListings(listings, skip, take) {
  const initIndex = skip * take;
  return listings.splice(initIndex, initIndex + take);
}

server.use(/^(\/listing\/new)|(\/user).*$/, (req, res, next) => {
  console.error('using');
  if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
    setResError(res, 'Error in authorisation format');
  } else {
    try {
      const payload = verifyToken(req.headers.authorization.split(' ')[1]);
      req.body.id = payload.id;
      next();
    } catch (err) {
      setResError(res, `Authentication error - ${err.message}`);
    }
  }
});

server.post('/auth/login', (req, res) => {
  const userdb = JSON.parse(fs.readFileSync(USERS_FILE_PATH, JSON_DATA_FORMAT));

  const { email, password } = req.body;
  const maybeUserId = userIdOrUndefined(email, password, userdb);
  if (maybeUserId === undefined) {
    setResError(res, 'Incorrect login credentials');
  } else {
    const access_token = createToken({ email, password, id: maybeUserId });
    res.status(200).json({ access_token });
  }
});

server.post('/auth/register', (req, res) => {
  const userdb = JSON.parse(fs.readFileSync(USERS_FILE_PATH, JSON_DATA_FORMAT));
  const { email, password, name } = req.body;
  if (getUser(email, userdb) === undefined) {
    userdb.users.push({ email, password, name, id: userdb.users.length });
    fs.writeFile(USERS_FILE_PATH, JSON.stringify(userdb, null, 2), JSON_DATA_FORMAT, () => res.status(200).json({ message: 'Registration success' }));
  } else {
    setResError(res, 'Email taken');
  }
});

server.post('/listing/new', (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_FILE_PATH, JSON_DATA_FORMAT));

  if (db.listings === null || db.listings === undefined) {
    db.listings = [];
  }
  const { id, address, name, description, price } = req.body;
  const listingId = db.listings.length;
  db.listings.push({ id: listingId, userId: id, name, address, description, price });
  fs.writeFile(
    DB_FILE_PATH,
    JSON.stringify(db, null, 2),
    JSON_DATA_FORMAT,
    () => res.status(200).json({ listingId, message: 'Listing posted successfully' })
  );
});

server.get('/listing/:listingId', (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_FILE_PATH, JSON_DATA_FORMAT));

  const listingId = parseInt(req.params.listingId, 10);
  const listing = db.listings.find((listing) => listing.id === listingId);
  if (listing === undefined) {
    setResError(res, `Listing of id ${req.params.listingId} not found`);
  } else {
    res.status(200).json(listing);
  }
});

server.get('/listing', (req, res) => {
  const db = JSON.parse(fs.readFileSync(DB_FILE_PATH, JSON_DATA_FORMAT));

  const query = req.query;
  const take = query.take;
  const skip = query.skip;
  const search = query.search;
  const listings = db.listings;
  const sortedListings = sortByReview(listings);
  res.status(200).json(skipTakeListings(sortedListings, skip, take));
});

server.use(router);

server.listen(8080, () => {
  console.log('Server Online')
});
