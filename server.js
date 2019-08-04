const fs = require('fs')
const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const jwt = require('jsonwebtoken')

const server = jsonServer.create()
const router = jsonServer.router('./database.json')

const USERS_FILE_PATH = './users.json';
const DB_FILE_PATH = './db.json';
const JSON_DATA_FORMAT = 'UTF-8';

const userdb = JSON.parse(fs.readFileSync(USERS_FILE_PATH, JSON_DATA_FORMAT));

const db = JSON.parse(fs.readFileSync(DB_FILE_PATH, JSON_DATA_FORMAT));

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
  const maybeUser = getUser(email);
  return maybeUser !== undefined && maybeUser.password === password ?
    maybeUser.id : undefined;
}

function getUser(email) {
  const maybeUserIndex = userdb.users.findIndex((user) => user.email === email);
  return maybeUserIndex === -1 ? undefined : userdb.users[maybeUserIndex];
}

server.use(/^(?!\/auth).*$/, (req, res, next) => {
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
  const { email, password } = req.body;
  const maybeUserId = userIdOrUndefined(email, password);
  if (maybeUserId === undefined) {
    setResError(res, 'Incorrect login credentials');
  } else {
    const access_token = createToken({ email, password, id: maybeUserId });
    res.status(200).json({ access_token });
  }
});

server.post('/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (getUser(email) === undefined) {
    userdb.users.push({ email, password, name, id: userdb.users.length });
    fs.writeFile(USERS_FILE_PATH, JSON.stringify(userdb, null, 2), JSON_DATA_FORMAT, () => res.status(200).json({ message: 'Registration success' }));
  } else {
    setResError(res, 'Email taken');
  }
});

server.post('/listings/new', (req, res) => {
  if (db.listings === null || db.listings === undefined) {
    db.listings = [];
  }
  const { id, address, name, description } = req.body;
  const listingId = db.listings.length;
  db.listings.push({ id: listingId, userId: id, name, address, description });
  fs.writeFile(
    DB_FILE_PATH,
    JSON.stringify(db, null, 2),
    JSON_DATA_FORMAT,
    () => res.status(200).json({ listingId, message: 'Listing posted successfully' })
  );
});


server.use(router);

server.listen(8080, () => {
  console.log('Server Online')
});
