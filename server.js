const express = require("express");
const bcrypt = require("bcrypt");
const serverless = require("serverless-http");
const { v4: uuidv4 } = require("uuid");
const { Sequelize, DataTypes } = require("sequelize");

// SQLiteの設定
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite", // データベースファイルの保存先
});

// モデル定義
const Post = sequelize.define("Post", {
  content: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  hashedPassword: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  uniqueId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
});

// サーバー設定
const app = express();
const PORT = 3000;

app.use(express.json()); // JSONリクエストを解析するミドルウェア

// データベースの同期（初回起動時にテーブルが作成されます）
sequelize
  .sync()
  .then(() => {
    console.log("Database synced");
  })
  .catch((err) => {
    console.error("Unable to sync the database:", err);
  });

// 年賀状投稿エンドポイント
app.post("/post", async (req, res) => {
  const { content, password } = req.body; // content: 年賀状データ, password: アクセス用パスワード

  console.log(req.body);
  if (!content || !password) {
    return res
      .status(400)
      .json({ error: "Content and password are required." });
  }

  const id = uuidv4(); // 一意のIDを生成
  const hashedPassword = await bcrypt.hash(password, 10); // パスワードをハッシュ化

  try {
    const post = await Post.create({
      content,
      hashedPassword,
      uniqueId: id,
    });

    // 成功レスポンス
    res.json({ url: `https://new-year-later.vercel.app/view/${id}` });
  } catch (error) {
    res.status(500).json({ error: "Error saving post." });
  }
});

// 年賀状表示エンドポイント
app.post("/view/:id", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    const post = await Post.findOne({ where: { uniqueId: id } });

    if (!post) {
      return res.status(404).json({ error: "Post not found." });
    }

    const isMatch = await bcrypt.compare(password, post.hashedPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password." });
    }

    res.json({ content: post.content });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving post." });
  }
});

module.exports.handler = serverless(app);
