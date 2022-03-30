const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "twitterClone.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  // why i am geting emoty object
  const registerQuery1 = `
    SELECT 
      *
    FROM 
      user 
    WHERE 
      username = '${username}'`;

  const userIsThere = await db.get(registerQuery1);
  //console.log(password, username, name, gender);
  if (userIsThere !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = bcrypt.hash(password, 10);
      const registerQuery2 = `
            INSERT INTO user 
            (username,password,name,gender)
            VALUES 
            ('${username}','${hashedPassword}','${name}','${gender}')`;

      await db.run(registerQuery2);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  const registerQuery1 = `
    SELECT 
      *
    FROM 
      user 
    WHERE 
      username = '${username}'`;

  const userIsThere = await db.get(registerQuery1);

  if (userIsThere !== undefined) {
    let passwordMatched = await bcrypt.compare(password, userIsThere.password);
    console.log(passwordMatched);
    if (passwordMatched) {
      let payload = { username };
      let token = jwt.sign(payload, "manideep");
      response.send({ jwtToken: token });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

//Authentication

let middleware = (request, response, next) => {
  let token;
  let tokenFromRequest = request.headers["authorization"];

  if (tokenFromRequest !== undefined) {
    token = tokenFromRequest.split(" ")[1];
  }
  if (token !== undefined) {
    jwt.verify(token, "manideep", (error, user) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = user.username;
        next();
      }
    });
  } else {
    response.status(401);
    response.send("Invalid JWT Token");
  }
};

// API 3

const listingObject = (value) => {
  return {
    username: value.username,
    tweet: value.tweet,
    dateTime: value.date_time,
  };
};

app.get("/user/tweets/feed/", middleware, async (request, response) => {
  const { username } = request;
  console.log(username);

  let query31 = `
    SELECT 
        *
    FROM 
        user
    WHERE 
      username = '${username}'`;

  const query3Db1 = await db.all(query31);
  const { user_id } = query3Db1[0];
  console.log(user_id);
  let query32 = `
    SELECT 
    user.username,
    tweet.tweet,
    tweet.date_time
    FROM 
    (follower INNER JOIN tweet 
    ON follower.following_user_id = tweet.user_id)AS P 
    INNER JOIN user ON P.following_user_id = user.user_id
    WHERE 
      follower.follower_user_id = ${user_id}
    LIMIT 4`;
  const query3Db2 = await db.all(query32);
  response.send(query3Db2.map((value) => listingObject(value)));
});

// api 4
const listingNames = (value) => {
  return {
    name: value.name,
  };
};

app.get("/user/following/", middleware, async (request, response) => {
  const { username } = request;
  let query41 = `
    SELECT 
         *
    FROM 
        user
    WHERE 
      username = '${username}'`;

  const query4Db1 = await db.all(query41);
  const { user_id } = query4Db1[0];
  const query42 = `
    SELECT 
       DISTINCT user.name
    FROM 
      follower INNER JOIN user ON 
      follower.follower_user_id = user.user_id;
    WHERE 
      follower_user_id = ${user_id};`;

  const query4Db2 = await db.all(query42);
  response.send(query4Db2.map((value) => listingNames(value)));
});

// api 5

app.get("/user/followers/", middleware, async (request, response) => {
  const { username } = request;
  let query41 = `
    SELECT 
         *
    FROM 
        user
    WHERE 
      username = '${username}'`;

  const query4Db1 = await db.all(query41);
  const { user_id } = query4Db1[0];

  const query5 = `
    SELECT 
      DISTINCT user.name
    FROM 
      follower INNER JOIN user ON 
      follower.following_user_id = user.user_id;
    WHERE 
      following_user_id = ${user_id};`;

  const query5Db = await db.all(query5);
  response.send(query5Db);
});

// api 6 not understand

app.get("/tweets/:tweetId/", middleware, async (request, response) => {
  const { tweetId } = request.params;

  const query6 = `
    SELECT 
      user.name
    FROM 
      like INNER JOIN tweet ON 
      tweet.tweet_id = like.tweet_id;
    WHERE 
      following_user_id = ${tweetId};`;

  const query6Db = await db.all(query6);
  response.send(query6Db);
});

// api 9

app.get("/user/tweets/", middleware, async (request, response) => {
  const { user } = request.params;

  const query9 = `
    SELECT 
      tweet.tweet,
      COUNT(like.like_id) AS likes,
      COUNT(reply.reply_id) AS replies,
      tweet.date_time
    FROM 
      (tweet INNER JOIN like ON 
      tweet.user_id = like.user_id ) AS P 
      INNER JOIN reply ON p.user_id = reply.user_id
    WHERE 
      user_id = ${user}
    GROUP BY 
      tweet.tweet_id`;

  let query9db = db.get(query9);
  response.send(query9db);
});

// api 10

app.post("/user/tweets/", middleware, async (request, response) => {
  const { user } = request.params;
  const { tweet } = request.body;
  let query10 = `
    INSERT INTO 
      tweet
    (tweet)
    VALUES 
      (object)`;
  await db.run(query10);
  response.send("Created a Tweet");
});

module.exports = app;
