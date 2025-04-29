require("dotenv").config();

const axios = require("axios");
const dayjs = require("dayjs");
const dedent = require("dedent");

const { Telegraf } = require("telegraf");
const telegramBot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const trendingTokensMap = new Map();
let pairsTimestamp = Math.floor(Date.now() / 1000); // will be used to store latest pair's timestamp

const majorTokensArray = [
    "So11111111111111111111111111111111111111112",  // wsol's address
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // usdc's address
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"  // usdt's address
];

/******************************************************************************************/

function formatBigNumber(num, prefix) {
    if (num) {
        if (num >= 1e12) { return `${prefix}${(num / 1e12).toFixed(1)}T`; } // Convert to trillions
        else if (num >= 1e9) { return `${prefix}${(num / 1e9).toFixed(1)}B`; } // Convert to billions
        else if (num >= 1e6) { return `${prefix}${(num / 1e6).toFixed(1)}M`; } // Convert to millions
        else if (num >= 1e3 || num >= 1e2) { return `${prefix}${(num / 1e3).toFixed(1)}K`; } // Convert to thousands
        else { return prefix + num; }
    }

    return "";
}

function calculateTimeDiff(now, pastTimestamp) {
    if (pastTimestamp) {
        const past = dayjs(pastTimestamp * 1000);

        const years = now.diff(past, "year");
        const months = now.diff(past, "month") % 12;
        const days = now.diff(past, "day") % 30;
        const hours = now.diff(past, "hour") % 24; 
        const minutes = now.diff(past, "minute") % 60;
        const seconds = now.diff(past, "second") % 60;


        if (years > 0) {
            return `${years}y ${months}mo ago`;

        } else if (months > 0) {
            return `${months}mo ${days}d ago`;

        } else if (days > 0) {
            return `${days}d ${hours}h ago`; 

        } else if (hours > 0) {
            return `${hours}h ${minutes}m ago`;
            
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s ago`;
            
        } else {
            return `${seconds}s ago`;
        }
    }

    return "";
}

async function postPair(newPair, tokenAddress, tokenMetadata, now) {
    try {
        const linksArray = [
            tokenMetadata.metadata && tokenMetadata.metadata.website ? `<a href="${tokenMetadata.metadata.website}">Website</a>` : null,
            tokenMetadata.metadata && tokenMetadata.metadata.twitter ? `<a href="${tokenMetadata.metadata.twitter}">Twitter</a>` : null,
            tokenMetadata.metadata && tokenMetadata.metadata.telegram ? `<a href="${tokenMetadata.metadata.telegram}">Telegram</a>` : null,
        ];

        const linksString = linksArray.filter(link => link).join(' | ');

        const message = `
        <b>🆕 Pair</b> - ${tokenMetadata.name} (#${tokenMetadata.symbol})
        ├<code>${tokenMetadata.address}</code>
        ├<code>Description:</code> ${tokenMetadata.metadata && tokenMetadata.metadata.description ? `<i>${tokenMetadata.metadata.description}</i>` : ""}
        ├<code>Links:</code> ${linksString}
        ├<code>Token Minted:</code> ${calculateTimeDiff(now, tokenMetadata.first_mint_time)}
        ├<code>Pool Created:</code> ${calculateTimeDiff(now, tokenMetadata.created_time)}
        ├<code>Mint:</code> ${!tokenMetadata.mint_authority ? "🟢" : "🔴"}
        ├<code>Freeze:</code> ${!tokenMetadata.freeze_authority ? "🟢" : "🔴"}
        ├<code>Holder Count:</code> ${tokenMetadata.holder ? tokenMetadata.holder.toLocaleString() : ""}
        └<code>MC:</code> ${formatBigNumber(tokenMetadata.market_cap)}
        
        <a href="https://solscan.io/token/${tokenAddress}">🔍 View on Solscan</a> | <a href="https://x.com/search?q=${tokenAddress}">🐦 Search on X</a>`;

        await telegramBot.telegram.sendMessage(
            process.env.TELEGRAM_PAIRS_CHANNEL,
            dedent(message),
            {
                parse_mode: "HTML",
                disable_web_page_preview: true
            }
        );

    } catch(error) {
        console.error(error);
    }
}

async function getPairs(shouldNotify) {
    try {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const now = dayjs(currentTimestamp * 1000);

        let currentPage = 1;
        let shouldContinue = true;
        let isPosted = false;

        while (shouldContinue) { // iterate through pages till reaching already recorded pairs
            try {
                const pairsResponse = await axios.get("https://pro-api.solscan.io/v2.0/market/list", {
                    params: { page: currentPage, page_size: 100 },
                    headers: { "token": process.env.SOLSCAN_API_KEY }
                });

                const newPairs = pairsResponse.data.data;
                const newPairsArray = newPairs.filter(pair => pair.created_time > pairsTimestamp); // only keep pairs that are new and haven't been recorded yet

                const latestPair = newPairsArray[0];

                if (!latestPair) { break; }

                if (latestPair.created_time <= pairsTimestamp) {
                    shouldContinue = false;

                } else {
                    currentPage++;
                }

                pairsTimestamp = latestPair.created_time;  // update the timestamp to the latest pair's creation time

                if (shouldNotify) {
                    for (let i = 0; i < newPairsArray.length; i++) {
                        try {
                            const tokenAddress = majorTokensArray.includes(newPairsArray[i].token1) ? newPairsArray[i].token2 : newPairsArray[i].token1; // get the non-major token's address

                            const metaResponse = await axios.get("https://pro-api.solscan.io/v2.0/token/meta", { // get more details about the token
                                params: { address: tokenAddress },
                                headers: { "token": process.env.SOLSCAN_API_KEY }
                            });

                            await postPair(newPairsArray[i], tokenAddress, metaResponse.data.data || {}, now);
                            await new Promise(resolve => setTimeout(resolve, 100));

                            isPosted = true;

                        } catch(error) {
                            console.error(error);
                        }
                    }
                }

            } catch(error) {
                console.error(error);
                pairsTimestamp =  Math.floor(Date.now() / 1000);
                shouldContinue = false;
                return;
            }
        }

        if (shouldNotify && isPosted) {
            console.log(`[${dayjs().format("HH:mm")}] Posted the updates for the new LP pairs.`);
        }

    } catch(error) {
        console.error(error);
    }
}

/******************************************************************************************/

async function postTrendingTokens(addedTokensArray, removedTokensArray) {
    try {
        let message = "";

        if (addedTokensArray.length > 0) {
            message += "<b>🔥 Tokens added to the trending list:</b>\n";

            for (let i = 0; i < addedTokensArray.length; i++) {
                message += `  ├ <code>Token ${i + 1}:</code> <a href="https://solscan.io/token/${addedTokensArray[i].address}">#${addedTokensArray[i].symbol}</a>` + "\n"; 
            }

            message = message.replace(/├(?![\s\S]*├)/, "└") + "\n";
        }

        if (removedTokensArray.length > 0) {
            message += "<b>👎 Tokens removed from the trending list:</b>\n";

            for (let i = 0; i < removedTokensArray.length; i++) {
                message += `  ├ <code>Token ${i + 1}:</code> <a href="https://solscan.io/token/${removedTokensArray[i].address}">#${removedTokensArray[i].symbol}</a>` + "\n"; 
            }

            message = message.replace(/├(?![\s\S]*├)/, "└");
        }

        if (message) {
            await telegramBot.telegram.sendMessage(
                process.env.TELEGRAM_TRENDING_CHANNEL,
                message,
                {
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                }
            );

            console.log(`[${dayjs().format("HH:mm")}] Posted the updates for the trending tokens list.`);
        }

    } catch(error) {
        console.error(error);
    }
}

async function getTrendingTokens(shouldNotify) {
    try {
        const trendingResponse = await axios.get("https://pro-api.solscan.io/v2.0/token/trending", {
            params: { limit: 100 },
            headers: { "token": process.env.SOLSCAN_API_KEY }
        });

        const newTrendingTokens = trendingResponse.data.data;
        const newTrendingTokensMap = new Map(newTrendingTokens.map(token => [token.address, token.symbol]));

        if (newTrendingTokensMap.size === 0) { return; }

        const addedTokensArray = [];
        const removedTokensArray = [];

        // Check and remove tokens that are no longer trending
        for (const [address, symbol] of trendingTokensMap) {
            if (!newTrendingTokensMap.has(address)) {
                trendingTokensMap.delete(address);
                removedTokensArray.push({address, symbol});
            }
        }

        // Check and add tokens that are now trending
        for (const [address, symbol] of newTrendingTokensMap) {
            if (!trendingTokensMap.has(address) && !majorTokensArray.includes(address)) {
                trendingTokensMap.set(address, symbol);
                addedTokensArray.push({address, symbol});
            }
        }

        if (shouldNotify) {
            await postTrendingTokens(addedTokensArray, removedTokensArray);
        }

    } catch(error) {
        console.error(error);
    }
}

/******************************************************************************************/

async function getSolscanData(shouldNotify) {
    try {
        await Promise.all([
            getTrendingTokens(shouldNotify), // fetch trending tokens to check for any changes in the current list
            getPairs(shouldNotify)           // fetch LP pairs to check for any new ones
        ]);

    } catch(error) {
        console.error(error);
    }
}

/******************************************************************************************/

async function main() {
    try {
        await getSolscanData(false);
        console.log("Initialized the variables.");

        setInterval(() => {
            getSolscanData(true);
        }, 10 * 1000); // trigger recursive call after 10s timeout

    } catch(error) {
        console.error(error);
    }
}

main();
