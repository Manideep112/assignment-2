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
      response.send("User created succesfully");
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
    let passwordMatched = bcrypt.compare(password, userIsThere.password);
    if (passwordMatched) {
      let payload = { username };
      let token = jwt.sign(payload, "manideep");
      response.send({ jwtToken: token });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

//Authentication

let middleware = (request, response, next) => {
  let token;
  let tokenFromRequest = request.headers["authentication"];

  if (tokenFromRequest !== undefined) {
    token = tokenFromRequest.split(" ")[1];
  }
  if (token !== undefined) {
    jwt.verify(token, "manideep", (error, user) => {
      if (error) {
        respond.status(401);
        respond.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  } else {
    respond.status(401);
    respond.send("Invalid JWT Token");
  }
};

app.get("/users/", async (request, response) => {
  let query = `
    SELECT 
      *
    FROM 
      user ;`;

  let dbResponse = app.all(query);
  response.send(dbResponse);
});

// API 3

app.get("/user/tweets/feed/", middleware, async (request, response) => {
  let { user } = request.params;
  let query3 = `
    SELECT 
    user.username,
    tweet.tweet,
    tweet.date_time
    FROM 
    (follower INNER JOIN tweet 
    ON follower.following_user_id = tweet.user_id)AS P 
    INNER JOIN user ON P.following_user_id = user.user_id;
    WHERE 
      follower.follower_user_id = ${user_id}
    LIMIT 4`;

  const query3Db = await db.all(query3);
  response.send(query3Db);
});

// api 4

app.get("/user/following/", middleware, async (request, response) => {
  const { user } = request.params;

  const query4 = `
    SELECT 
      user.name
    FROM 
      follower INNER JOIN user ON 
      follower.following_user_id = user.user_id;
    WHERE 
      follower_user_id = ${user};`;

  const query4Db = await db.all(query4);
  response.send(query4Db);
});

// api 5

app.get("/user/followers/", middleware, async (request, response) => {
  const { user } = request.params;

  const query5 = `
    SELECT 
      user.name
    FROM 
      follower INNER JOIN user ON 
      follower.follower_user_id = user.user_id;
    WHERE 
      following_user_id = ${user};`;

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
