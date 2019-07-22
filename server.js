const fs = require('fs')
const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const jwt = require('jsonwebtoken')

const server = jsonServer.create()
const router = jsonServer.router('./database.json')

const USERS_FILE_PATH = './users.json';
const JSON_DATA_FORMAT = 'UTF-8';
const userdb = JSON.parse(fs.readFileSync(USERS_FILE_PATH, JSON_DATA_FORMAT))

const ERROR_CODE = 401;

server.use(jsonServer.defaults(), jsonServer.bodyParser);

const SECRET_KEY = '9707500312';

const expiresIn = '1h';

function setResError(res, message) {
  res.status(ERROR_CODE).json({ 'status': ERROR_CODE, message });
}

function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn })
}

function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined ? decode : err)
}

function correctLoginDetails(email, password) {
  const maybeUser = getUser(email);
  return maybeUser !== undefined && maybeUser.password === password;
}

function getUser(email) {
  const maybeUserIndex = userdb.users.findIndex((user) => user.email === email);
  return maybeUserIndex === -1 ? undefined : userdb.users[maybeUserIndex];
}


server.post('/auth/login', (req, res) => {

  const { email, password } = req.body;
  console.error(email, password);
  if (correctLoginDetails(email, password)) {
    const access_token = createToken({ email, password });
    res.status(200).json({ access_token });
  } else {
    const status = 401;
    const message = 'Incorrect email or password';
    res.status(status).json({ status, message });
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

server.use(/^(?!\/auth).*$/, (req, res, next) => {
  if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
    const status = 401
    const message = 'Error in authorization format'
    res.status(status).json({ status, message })
    return
  }
  try {
    verifyToken(req.headers.authorization.split(' ')[1])
    next()
  } catch (err) {
    const status = 401
    const message = 'Error access_token is revoked'
    res.status(status).json({ status, message })
  }
})

server.use(router)

server.listen(8080, () => {
  console.log('Server Online')
})
