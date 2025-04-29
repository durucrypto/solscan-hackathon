# 🔍 Solana Trending Tokens & New LP Pairs Tracker Bot

A Telegram bot that helps you stay on top of **trending tokens** and **newly created token pairs** on the **Solana blockchain**, with built-in insights and safety checks.

---

## 🚀 Objectives & Scope

This project aims to provide a convenient and transparent way to:

- Monitor **trending tokens** on Solana,
- Track **newly created token pairs** with relevant token information,
- Deliver updates directly to Telegram for real-time alerts.

---

## 🛠 Technical Architecture

- Utilizes [Solscan's Pro API](https://pro-api.solscan.io/) for fetching token and market data.
- Polls the API every 10 seconds (customizable) to catch and post newly added entries.
- Posts updates to its designated Telegram channel/group.

---
	
## 🔁 Data Flow & Logic

1. Every 10 seconds (adjustable), the bot makes requests for trending tokens and new LP pairs to the Solscan API.
2. For trending tokens, it compares the current list with the new list to figure out new additions and removals.
3. For new pairs, it compares timestamps to detect new pairs.
4. When new trending tokens or LP pairs are found, it sends formatted alerts on Telegram.

---

## 📈 Impact & Relevance

This tool is built to:

- **Level the playing field** for all users by sharing early token and pair data quickly.
- Increase **transparency** and **market awareness**.
- Enhance the **trading experience** for Solana-based users and communities.

---

## 🔗 Telegram Channels

- **Trending Tokens:** [Join Channel](https://t.me/solscan_hackathon_trending)
- **New Pairs:** [Join Channel](https://t.me/solscan_hackathon_pairs)

---

## ⚙️ Setup Instructions

1. Clone the repository:
   git clone https://github.com/your-repo/solscan-bot.git
   cd solscan-bot

2. Install dependencies:
   npm install

3. Create your .env file:
   cp sample.env .env
   #### Then open .env and add your config values

4. Start the bot:
   npm start
   #### or, if you prefer:
   node solscanBot.js
