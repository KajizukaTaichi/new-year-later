const express = require("express");
const bcrypt = require("bcrypt");
const serverless = require("serverless-http");
const { v4: uuidv4 } = require("uuid");

// 保存
let database = {};

// サーバー設定
const app = express();
app.use(express.json());

// 年賀状投稿エンドポイント
app.post("/post", async (req, res) => {
  // content: 年賀状データ, password: アクセス用パスワード
  const { content, password } = req.body;

  if (!content || !password) {
    return res
      .status(400)
      .json({ error: "Content and password are required." });
  }

  const id = uuidv4(); // 一意のIDを生成
  const hashedPassword = await bcrypt.hash(password, 10); // パスワードをハッシュ化

  try {
    database[id] = { password: hashedPassword, content: content };
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
    const post = database[id];

    if (!post) {
      return res.status(404).json({ error: "Post not found." });
    }

    const isMatch = await bcrypt.compare(password, post.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password." });
    }

    res.json({ content: post.content });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving post." });
  }
});

module.exports = serverless(app);
