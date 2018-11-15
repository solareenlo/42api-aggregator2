const fetch = require('node-fetch');
const Bottleneck = require('bottleneck');

let APItoken = null;
const TOKEN_LIFETIME_IN_SECONDS = 7200;

const limiter = new Bottleneck({
  maxConcurrent: 2,
  minTime: 1000 / (process.env.FT_API_RATE_LIMIT_PER_SECOND || 1.8), // we don't set to 2s since sometimes api doesn't keep up
  reservoir: process.env.FT_API_RATE_LIMIT_PER_HOUR || 1150, // we don't set to 1200 for the same reason
  reservoirRefreshAmount: process.env.FT_API_RATE_LIMIT_PER_HOUR || 1150,
  reservoirRefreshInterval: 60 * 1000 * 60, // one hour
});

const call = (endpoint, method, params, force) => {
  let currentDate = new Date();
  let tokenExpirationDate = new Date();

  if (APItoken) {
    tokenExpirationDate.setTime((APItoken.created_at + TOKEN_LIFETIME_IN_SECONDS) * 1000);
  }
  if (!force && (!APItoken || currentDate.getTime() > tokenExpirationDate.getTime())) {
    return getToken()
      .then((token) => {
        APItoken = token;
        tokenExpirationDate.setTime((APItoken.created_at + TOKEN_LIFETIME_IN_SECONDS) * 1000);
        console.log('Token expire =>', tokenExpirationDate);
        return call(endpoint, method, params);
      });
  }
  return new Promise((resolve, reject) => {
    let url = `${process.env.FT_API_ENDPOINT}${endpoint}`;
    if (params) {
      url += '?';
      Object.keys(params).forEach((key) => {
        if (params[key]) {
          url += `${key}=${params[key]}&`;
        } else {
          url += `${key}&`;
        }
      });
    }
    let fetchHeaders = {};
    if (APItoken) {
      fetchHeaders.Authorization = `Bearer ${APItoken.access_token}`;
    }
    console.info('New Api Call', url);
    limiter.schedule(() => fetch(url, {
      method,
      headers: fetchHeaders,
      timeout: 25000, // 25 sec we are not to picky with 42Api
    }))
      .then(res => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error('42API said: ' + res.statusText + ' for ' + url);
        }
      })
      .then(json => {
        if (json.error) {
          return reject(json);
        }
        resolve(json);
      })
      .catch(err => reject(err));
  });
};


const getToken = () => call('/oauth/token', 'POST', {
  grant_type: 'client_credentials',
  client_id: process.env.FT_API_UID,
  client_secret: process.env.FT_API_SECRET,
}, true);

const getCampus = () => call('/v2/campus', 'GET', {
  'page[size]': 100,
});

const getCoalitions = () => call('/v2/coalitions', 'GET', {
  'page[size]': 100,
});

const getCursus = () => call('/v2/cursus', 'GET', {
  'page[size]': 100,
});

const getProjects = (page, size) => call('/v2/projects', 'GET', {
  'page[number]': page,
  'page[size]': size,
});

const getSubProjects = (projectId) => call(`/v2/projects/${projectId}/projects`, 'GET', {
  'page[size]': 30,
});

const getUsers = (page, size) => call('/v2/users', 'GET', {
  'page[number]': page,
  'page[size]': size,
});

const getUser = (userId) => call(`/v2/users/${userId}`, 'GET');

const getUsersCursus = (page, size) => call('/v2/cursus_users', 'GET', {
  'page[number]': page,
  'page[size]': size,
});

const getUsersCampus = (page, size) => call('/v2/campus_users', 'GET', {
  'page[number]': page,
  'page[size]': size,
});

const getLocations = (page, size) => call('/v2/locations', 'GET', {
  'filter[end]': true, // get only finished locations
  sort: 'begin_at', // get older first
  'page[number]': page,
  'page[size]': size,
});

const getAchievements = (page, size) => call('/v2/achievements', 'GET', {
  'page[number]': page,
  'page[size]': size,
});

const usersCoalitions = (page, size) => call('/v2/coalitions_users', 'GET', {
  'page[number]': page,
  'page[size]': size,
});

const usersQuests = (page, size) => call('/v2/quests_users', 'GET', {
  'page[number]': page,
  'page[size]': size,
});

const usersCursus = (page, size) => call('/v2/cursus_users', 'GET', {
  'page[number]': page,
  'page[size]': size,
});

const apps = (page, size) => call('/v2/apps', 'GET', {
  'page[number]': page,
  'page[size]': size,
});

module.exports = {
  getCampus,
  getCoalitions,
  getCursus,
  getProjects,
  getSubProjects,
  getUsers,
  getUser,
  getUsersCursus,
  getUsersCampus,
  getLocations,
  getAchievements,
  usersCoalitions,
  usersQuests,
  usersCursus,
  apps,
};
